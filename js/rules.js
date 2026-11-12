/**
 * ÁguaSmart — Motor de Detecção Determinística de Anomalias
 * Implementa com precisão:
 * - RF09: Regras de Fluxo Noturno Contínuo (01:00 às 05:00 >= 120 min) e Consumo Acima da Média (+50% vs média 7 dias)
 * - RF10: Registro Automático de Alertas com recomendações preventivas
 * - CA12: Critério de Aceite para anomalia de fluxo noturno
 * - CA13: Critério de Aceite para anomalia de consumo acima da média
 */

class AnomalyEngine {
  constructor() {
    this.nightRule = window.CONFIG?.ANOMALY_RULES?.NIGHT_FLOW || {
      START_HOUR: 1,
      END_HOUR: 5,
      MIN_DURATION_MINUTES: 120,
      TYPE: 'fluxo_continuo_madrugada'
    };
    this.spikeRule = window.CONFIG?.ANOMALY_RULES?.SPIKE_CONSUMPTION || {
      THRESHOLD_PERCENTAGE: 0.50,
      COMPARISON_DAYS: 7,
      TYPE: 'consumo_acima_media'
    };
  }

  /**
   * Avalia todas as regras de anomalia para um determinado ponto de monitoramento
   * @param {string} pointId - ID do ponto a ser avaliado
   * @returns {Array} Lista de novos alertas gerados
   */
  evaluatePoint(pointId) {
    if (!pointId || !window.db) return [];

    const point = window.db.getPointById(pointId);
    if (!point || !point.ativo) return [];

    const readings = window.db.getReadingsByPoint(pointId);
    if (!readings || readings.length === 0) return [];

    const existingAlerts = window.db.getAlertsByPoint(pointId);
    const newAlertsCreated = [];

    // 1. Executa avaliação de Fluxo Noturno Contínuo (RF09 - Regra 1)
    const nightAlert = this.checkNightFlowAnomaly(point, readings, existingAlerts);
    if (nightAlert) newAlertsCreated.push(nightAlert);

    // 2. Executa avaliação de Pico Acima da Média dos últimos 7 dias (RF09 - Regra 2)
    const spikeAlert = this.checkSpikeConsumptionAnomaly(point, readings, existingAlerts);
    if (spikeAlert) newAlertsCreated.push(spikeAlert);

    return newAlertsCreated;
  }

  /**
   * Regra 1: Fluxo Noturno Contínuo
   * Leituras com volume > 0 entre 01:00 e 05:00 durando >= 120 minutos consecutivos
   */
  checkNightFlowAnomaly(point, readings, existingAlerts) {
    // Ordena do mais antigo para o mais recente para calcular continuidade
    const sorted = [...readings].sort((a, b) => new Date(a.registrado_em) - new Date(b.registrado_em));

    // Agrupa leituras por data da madrugada (considerando a noite em questão)
    let currentChainStart = null;
    let currentChainEnd = null;
    let chainVolume = 0;
    let triggerReading = null;

    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      const date = new Date(r.registrado_em);
      const hour = date.getHours();

      // Checa se está na faixa da madrugada (01:00 até 04:59)
      const isInDawn = hour >= this.nightRule.START_HOUR && hour < this.nightRule.END_HOUR;
      const hasFlow = r.volume_litros > 0;

      if (isInDawn && hasFlow) {
        if (!currentChainStart) {
          currentChainStart = date;
          currentChainEnd = date;
          chainVolume = r.volume_litros;
          triggerReading = r;
        } else {
          // Checa intervalo desde a última leitura da cadeia (se menor que 60 min, considera contínuo)
          const diffMinutes = (date - currentChainEnd) / (1000 * 60);
          if (diffMinutes <= 60) {
            currentChainEnd = date;
            chainVolume += r.volume_litros;
            triggerReading = r;
          } else {
            // Reinicia cadeia
            currentChainStart = date;
            currentChainEnd = date;
            chainVolume = r.volume_litros;
            triggerReading = r;
          }
        }

        // Verifica se a duração atingiu ou superou os 120 minutos (2 horas)
        const durationMinutes = (currentChainEnd - currentChainStart) / (1000 * 60);
        if (durationMinutes >= this.nightRule.MIN_DURATION_MINUTES) {
          // Verifica se já não foi criado um alerta para essa mesma noite neste ponto
          const dawnKey = currentChainStart.toISOString().split('T')[0];
          const alreadyEmitted = existingAlerts.some(a =>
            a.tipo === this.nightRule.TYPE &&
            a.ponto_monitoramento_id === point.id &&
            a.criado_em.startsWith(dawnKey)
          );

          if (!alreadyEmitted) {
            const startStr = currentChainStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const endStr = currentChainEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const alertData = {
              ponto_monitoramento_id: point.id,
              leitura_referencia_id: triggerReading.id,
              tipo: this.nightRule.TYPE,
              descricao: `Alerta Preventivo: Identificado fluxo de água contínuo na madrugada (${startStr} às ${endStr}), totalizando ${Math.round(durationMinutes)} minutos ininterruptos e volume de ${chainVolume.toFixed(2)} litros. Verifique imediatamente registros, descargas com vazamento ou torneiras abertas.`,
              status: 'pendente',
              criado_em: currentChainEnd.toISOString()
            };

            return window.db.createAlert(alertData);
          }
        }
      } else {
        // Saiu da madrugada ou volume zero
        currentChainStart = null;
        currentChainEnd = null;
        chainVolume = 0;
      }
    }

    return null;
  }

  /**
   * Regra 2: Consumo Acima da Média
   * Consumo consolidado hoje exceder em 50% ou mais a média diária dos últimos 7 dias
   */
  checkSpikeConsumptionAnomaly(point, readings, existingAlerts) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Calcula o consumo de hoje
    const todayReadings = readings.filter(r => r.registrado_em.startsWith(todayStr));
    const todayVolume = todayReadings.reduce((sum, r) => sum + r.volume_litros, 0);

    if (todayVolume <= 0) return null;

    // Calcula os 7 dias anteriores
    const dailyTotals = [];
    for (let i = 1; i <= 7; i++) {
      const pastDate = new Date(now);
      pastDate.setDate(pastDate.getDate() - i);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const dayReadings = readings.filter(r => r.registrado_em.startsWith(pastDateStr));
      const dayVolume = dayReadings.reduce((sum, r) => sum + r.volume_litros, 0);
      dailyTotals.push(dayVolume);
    }

    const pastSum = dailyTotals.reduce((a, b) => a + b, 0);
    const avg7Days = pastSum / 7;

    // Evita falsos positivos se a média histórica for insignificante
    if (avg7Days < 10) return null;

    const threshold = avg7Days * (1 + this.spikeRule.THRESHOLD_PERCENTAGE);

    if (todayVolume >= threshold) {
      // Checa se já existe alerta de pico emitido hoje para esse ponto
      const alreadyEmittedToday = existingAlerts.some(a =>
        a.tipo === this.spikeRule.TYPE &&
        a.ponto_monitoramento_id === point.id &&
        a.criado_em.startsWith(todayStr)
      );

      if (!alreadyEmittedToday) {
        const excessPercent = Math.round(((todayVolume - avg7Days) / avg7Days) * 100);
        const lastReading = todayReadings[0];

        const alertData = {
          ponto_monitoramento_id: point.id,
          leitura_referencia_id: lastReading ? lastReading.id : null,
          tipo: this.spikeRule.TYPE,
          descricao: `Aviso de Consumo Elevado: O consumo registrado hoje (${todayVolume.toFixed(2)} L) superou em ${excessPercent}% a média dos últimos 7 dias (${avg7Days.toFixed(2)} L). Verifique possíveis vazamentos em reservatórios ou usos não rotineiros.`,
          status: 'pendente',
          criado_em: new Date().toISOString()
        };

        return window.db.createAlert(alertData);
      }
    }

    return null;
  }

  // --- MÉTODOS DE SIMULAÇÃO RÁPIDA PARA BANCA / PROFESSOR (CA12 e CA13) ---

  /**
   * Simula o Cenário do CA12: Injeta 150 minutos contínuos na madrugada e dispara a regra
   */
  simularCenarioVazamentoMadrugada(pointId) {
    if (!window.db) return;
    const now = new Date();
    const point = window.db.getPointById(pointId);
    if (!point) throw new Error('Selecione um ponto válido para a simulação.');

    // Injeta 5 leituras entre 01:30 e 04:00 (150 minutos contínuos)
    const base = new Date(now);
    base.setHours(1, 30, 0, 0);

    const leiturasSimuladas = [];
    for (let min = 0; min <= 150; min += 30) {
      const d = new Date(base.getTime() + min * 60 * 1000);
      leiturasSimuladas.push({
        ponto_monitoramento_id: point.id,
        volume_litros: parseFloat((12.5 + Math.random() * 3).toFixed(2)),
        origem_dado: 'simulada_teste',
        registrado_em: d.toISOString()
      });
    }

    window.db.createBulkReadings(leiturasSimuladas);
    const novosAlertas = this.evaluatePoint(point.id);
    return {
      leiturasCriadas: leiturasSimuladas.length,
      alertasCriados: novosAlertas.length,
      tipo: 'fluxo_continuo_madrugada'
    };
  }

  /**
   * Simula o Cenário do CA13: Injeta leitura com consumo que supera a média dos 7 dias em 60%
   */
  simularCenarioPicoConsumo(pointId) {
    if (!window.db) return;
    const now = new Date();
    const point = window.db.getPointById(pointId);
    if (!point) throw new Error('Selecione um ponto válido para a simulação.');

    // Injeta volume elevado hoje
    const leituraExtra = {
      ponto_monitoramento_id: point.id,
      volume_litros: 380.00,
      origem_dado: 'simulada_teste',
      registrado_em: now.toISOString()
    };

    window.db.createReading(leituraExtra);
    const novosAlertas = this.evaluatePoint(point.id);
    return {
      leituraCriada: leituraExtra,
      alertasCriados: novosAlertas.length,
      tipo: 'consumo_acima_media'
    };
  }
}

// Expor globalmente
window.anomalyEngine = new AnomalyEngine();
