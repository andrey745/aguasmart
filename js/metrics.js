/**
 * ÁguaSmart — Consolidação de Métricas, KPIs e Séries Temporais para Gráficos
 * Implementa com precisão:
 * - RF07 / CA11: Métricas de consumo consolidado em 3 janelas (24h, 7 dias, mês corrente)
 * - RF14: Métricas operacionais globais para o Painel Administrativo
 * - Indicadores ODS 6 (Água Potável) e ODS 12 (Consumo Responsável)
 */

class MetricsService {
  constructor() {
    this.tariffPerLiter = window.CONFIG?.TARIFF_PER_LITER || 0.0052;
  }

  /**
   * Consolida as métricas do painel para um ponto específico ou para todos os pontos do usuário
   */
  getUserSummary(userId, selectedPointId = null) {
    if (!window.db || !userId) {
      return {
        daily: { liters: 0, cost: '0,00', changePercent: 0 },
        weekly: { liters: 0, cost: '0,00', changePercent: 0 },
        monthly: { liters: 0, cost: '0,00', projection: 0 },
        averageDaily7d: 0,
        activePointsCount: 0,
        pendingAlertsCount: 0
      };
    }

    const userPoints = window.db.getPointsByUser(userId);
    const activePoints = userPoints.filter(p => p.ativo);

    // Determina quais pontos incluir no cálculo
    let targetPointIds = [];
    if (selectedPointId && selectedPointId !== 'all') {
      targetPointIds = [selectedPointId];
    } else {
      targetPointIds = activePoints.map(p => p.id);
    }

    const allReadings = window.db.getAllReadings().filter(r => targetPointIds.includes(r.ponto_monitoramento_id));

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 3600 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 3600 * 1000);

    // Mês civil corrente
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Janela Diária (Últimas 24h vs 24h anteriores)
    const readings24h = allReadings.filter(r => new Date(r.registrado_em) >= oneDayAgo);
    const liters24h = readings24h.reduce((acc, r) => acc + r.volume_litros, 0);

    const readingsPrev24h = allReadings.filter(r => {
      const d = new Date(r.registrado_em);
      return d >= twoDaysAgo && d < oneDayAgo;
    });
    const litersPrev24h = readingsPrev24h.reduce((acc, r) => acc + r.volume_litros, 0);

    const dailyChangePercent = litersPrev24h > 0
      ? Math.round(((liters24h - litersPrev24h) / litersPrev24h) * 100)
      : 0;

    // 2. Janela Semanal (Últimos 7 dias vs 7 dias anteriores)
    const readings7d = allReadings.filter(r => new Date(r.registrado_em) >= sevenDaysAgo);
    const liters7d = readings7d.reduce((acc, r) => acc + r.volume_litros, 0);

    const readingsPrev7d = allReadings.filter(r => {
      const d = new Date(r.registrado_em);
      return d >= fourteenDaysAgo && d < sevenDaysAgo;
    });
    const litersPrev7d = readingsPrev7d.reduce((acc, r) => acc + r.volume_litros, 0);

    const weeklyChangePercent = litersPrev7d > 0
      ? Math.round(((liters7d - litersPrev7d) / litersPrev7d) * 100)
      : 0;

    const averageDaily7d = liters7d / 7;

    // 3. Janela Mensal (Mês civil corrente)
    const readingsMonth = allReadings.filter(r => new Date(r.registrado_em) >= startOfCurrentMonth);
    const litersMonth = readingsMonth.reduce((acc, r) => acc + r.volume_litros, 0);

    // Projeção para o fim do mês corrente
    const dayOfMonth = now.getDate();
    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthlyProjection = dayOfMonth > 0 ? (litersMonth / dayOfMonth) * daysInCurrentMonth : litersMonth;

    // Custos
    const formatBRL = (val) => (val * this.tariffPerLiter).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Contagem de alertas pendentes
    const userAlerts = window.db.getAlertsByUser(userId);
    const pendingAlerts = userAlerts.filter(a => {
      if (selectedPointId && selectedPointId !== 'all') {
        return a.ponto_monitoramento_id === selectedPointId && a.status === 'pendente';
      }
      return a.status === 'pendente';
    }).length;

    return {
      daily: {
        liters: Math.round(liters24h * 10) / 10,
        cost: formatBRL(liters24h),
        changePercent: dailyChangePercent
      },
      weekly: {
        liters: Math.round(liters7d * 10) / 10,
        cost: formatBRL(liters7d),
        changePercent: weeklyChangePercent
      },
      monthly: {
        liters: Math.round(litersMonth * 10) / 10,
        cost: formatBRL(litersMonth),
        projection: Math.round(monthlyProjection * 10) / 10,
        projectionCost: formatBRL(monthlyProjection)
      },
      averageDaily7d: Math.round(averageDaily7d * 10) / 10,
      activePointsCount: activePoints.length,
      pendingAlertsCount: pendingAlerts
    };
  }

  /**
   * Prepara dados para o gráfico de consumo por hora nas últimas 24 horas
   */
  getHourlyChartData(userId, selectedPointId = null) {
    const now = new Date();
    const labels = [];
    const values = [];

    const targetPoints = this.getTargetPointIds(userId, selectedPointId);
    const allReadings = window.db.getAllReadings().filter(r => targetPoints.includes(r.ponto_monitoramento_id));

    // Gera 24 intervalos de 1 hora
    for (let i = 23; i >= 0; i--) {
      const slotStart = new Date(now.getTime() - (i + 1) * 3600 * 1000);
      const slotEnd = new Date(now.getTime() - i * 3600 * 1000);

      const label = slotEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      labels.push(label);

      const slotReadings = allReadings.filter(r => {
        const d = new Date(r.registrado_em);
        return d >= slotStart && d < slotEnd;
      });

      const totalLiters = slotReadings.reduce((sum, r) => sum + r.volume_litros, 0);
      values.push(parseFloat(totalLiters.toFixed(1)));
    }

    return { labels, values };
  }

  /**
   * Prepara dados para o gráfico de consumo diário nos últimos 7 dias
   */
  getDaily7DaysChartData(userId, selectedPointId = null) {
    const now = new Date();
    const labels = [];
    const values = [];

    const targetPoints = this.getTargetPointIds(userId, selectedPointId);
    const allReadings = window.db.getAllReadings().filter(r => targetPoints.includes(r.ponto_monitoramento_id));

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - i);
      const dateStr = targetDate.toISOString().split('T')[0];

      // Formato: "Seg (10/11)"
      const dayName = targetDate.toLocaleDateString('pt-BR', { weekday: 'short' });
      const dayMonth = targetDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      labels.push(`${dayName.replace('.', '')} (${dayMonth})`);

      const dayReadings = allReadings.filter(r => r.registrado_em.startsWith(dateStr));
      const totalLiters = dayReadings.reduce((sum, r) => sum + r.volume_litros, 0);
      values.push(parseFloat(totalLiters.toFixed(1)));
    }

    return { labels, values };
  }

  /**
   * Prepara dados para o gráfico de consumo diário nos últimos 30 dias
   */
  getDaily30DaysChartData(userId, selectedPointId = null) {
    const now = new Date();
    const labels = [];
    const values = [];

    const targetPoints = this.getTargetPointIds(userId, selectedPointId);
    const allReadings = window.db.getAllReadings().filter(r => targetPoints.includes(r.ponto_monitoramento_id));

    for (let i = 29; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - i);
      const dateStr = targetDate.toISOString().split('T')[0];

      const dayMonth = targetDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      labels.push(dayMonth);

      const dayReadings = allReadings.filter(r => r.registrado_em.startsWith(dateStr));
      const totalLiters = dayReadings.reduce((sum, r) => sum + r.volume_litros, 0);
      values.push(parseFloat(totalLiters.toFixed(1)));
    }

    return { labels, values };
  }

  /**
   * Prepara distribuição de consumo por ponto de monitoramento
   */
  getDistributionByPointData(userId) {
    const userPoints = window.db.getPointsByUser(userId);
    const allReadings = window.db.getAllReadings();

    const labels = [];
    const values = [];
    const colors = [
      '#0284c7', // Sky blue
      '#0d9488', // Teal
      '#6366f1', // Indigo
      '#f59e0b', // Amber
      '#ec4899', // Pink
      '#10b981'  // Emerald
    ];

    userPoints.forEach(p => {
      const pointReadings = allReadings.filter(r => r.ponto_monitoramento_id === p.id);
      const total = pointReadings.reduce((sum, r) => sum + r.volume_litros, 0);
      labels.push(p.nome);
      values.push(parseFloat(total.toFixed(1)));
    });

    return {
      labels,
      values,
      colors: colors.slice(0, labels.length)
    };
  }

  /**
   * Helper para obter IDs dos pontos selecionados
   */
  getTargetPointIds(userId, selectedPointId) {
    const userPoints = window.db.getPointsByUser(userId);
    if (selectedPointId && selectedPointId !== 'all') {
      return [selectedPointId];
    }
    return userPoints.map(p => p.id);
  }

  /**
   * Métricas Operacionais Globais para o Painel Administrativo (RF14)
   */
  getAdminMetrics() {
    const users = window.db.getUsers();
    const points = window.db.getAllPoints();
    const readings = window.db.getAllReadings();
    const alerts = window.db.getAllAlerts();

    const totalLiters = readings.reduce((sum, r) => sum + r.volume_litros, 0);
    const totalCubicMeters = (totalLiters / 1000).toFixed(2);

    const pendingAlerts = alerts.filter(a => a.status === 'pendente').length;
    const resolvedAlerts = alerts.filter(a => a.status === 'resolvido').length;

    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.ativo).length,
      totalPoints: points.length,
      activePoints: points.filter(p => p.ativo).length,
      totalReadings: readings.length,
      totalLiters: Math.round(totalLiters),
      totalCubicMeters: totalCubicMeters,
      totalAlerts: alerts.length,
      pendingAlerts: pendingAlerts,
      resolvedAlerts: resolvedAlerts
    };
  }
}

// Expor globalmente
window.metricsService = new MetricsService();
