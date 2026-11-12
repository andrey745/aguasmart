/**
 * ÁguaSmart — Camada de Persistência e Dados Demonstrativos (Mock DB)
 * Implementa armazenamento em LocalStorage com suporte a dados pré-carregados,
 * integridade referencial (RF12) e isolamento multiusuário (RF13).
 */

class AguasmartDB {
  constructor() {
    this.storageKey = window.CONFIG?.STORAGE_KEY || 'aguasmart_system_db_v1';
    this.init();
  }

  init() {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      this.seedDefaultData();
    }
  }

  getRawData() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Erro ao ler LocalStorage:', e);
      return null;
    }
  }

  saveRawData(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Erro ao salvar no LocalStorage:', e);
      return false;
    }
  }

  resetToDefault() {
    this.seedDefaultData();
  }

  // Gera dados iniciais completos alinhados ao spec.md
  seedDefaultData() {
    const now = new Date();

    // 1. Usuários (RF01, RF14)
    const usuarios = [
      {
        id: 'usr_andrey',
        nome: 'Andrey Iago Costa Carvalho',
        email: 'andrey@aguasmart.com',
        senha_hash: 'senha1234', // Em produção seria bcrypt
        papel: 'cliente',
        instituicao: 'IFRO - Campus Porto Velho Calama',
        ativo: true,
        criado_em: new Date(now.getTime() - 45 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'usr_beatriz',
        nome: 'Dra. Beatriz Silveira',
        email: 'beatriz@condominio.com',
        senha_hash: 'senha1234',
        papel: 'cliente',
        instituicao: 'Residencial Rio Madeira',
        ativo: true,
        criado_em: new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'usr_admin',
        nome: 'Administrador do Sistema',
        email: 'admin@aguasmart.com',
        senha_hash: 'admin1234',
        papel: 'administrador',
        instituicao: 'ÁguaSmart Tech / IFRO',
        ativo: true,
        criado_em: new Date(now.getTime() - 60 * 24 * 3600 * 1000).toISOString()
      }
    ];

    // 2. Pontos de Monitoramento (RF04, RF05)
    const pontos_monitoramento = [
      {
        id: 'pto_cavalete',
        usuario_id: 'usr_andrey',
        nome: 'Cavalete Principal',
        localizacao_descritiva: 'Entrada geral do imóvel - Medidor frontal',
        ativo: true,
        criado_em: new Date(now.getTime() - 40 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'pto_cozinha',
        usuario_id: 'usr_andrey',
        nome: 'Cozinha & Área Gourmet',
        localizacao_descritiva: 'Térreo interno - Bancada principal',
        ativo: true,
        criado_em: new Date(now.getTime() - 35 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'pto_reservatorio',
        usuario_id: 'usr_andrey',
        nome: 'Reservatório Superior (Caixa d\'Água)',
        localizacao_descritiva: 'Laje técnica de cobertura - 1.000L',
        ativo: true,
        criado_em: new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'pto_jardim',
        usuario_id: 'usr_andrey',
        nome: 'Área Externa & Jardim',
        localizacao_descritiva: 'Torneira dos fundos e irrigação',
        ativo: false,
        criado_em: new Date(now.getTime() - 20 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'pto_bloco_a',
        usuario_id: 'usr_beatriz',
        nome: 'Bloco A - Hidrômetro Central',
        localizacao_descritiva: 'Hall de entrada do bloco A',
        ativo: true,
        criado_em: new Date(now.getTime() - 25 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'pto_piscina',
        usuario_id: 'usr_beatriz',
        nome: 'Área de Lazer & Vestiários',
        localizacao_descritiva: 'Casa de bombas e duchas',
        ativo: true,
        criado_em: new Date(now.getTime() - 22 * 24 * 3600 * 1000).toISOString()
      }
    ];

    // 3. Gerador dinâmico de leituras de consumo realistas para os últimos 30 dias (RF06, RF15)
    const leituras_consumo = [];
    let leituraCounter = 1;

    // Helper para adicionar leitura
    const addLeitura = (pontoId, volume, dataDate, origem) => {
      leituras_consumo.push({
        id: `lei_${leituraCounter++}`,
        ponto_monitoramento_id: pontoId,
        volume_litros: parseFloat(volume.toFixed(2)),
        origem_dado: origem || (Math.random() > 0.4 ? 'simulada_teste' : 'manual'),
        registrado_em: dataDate.toISOString()
      });
    };

    // Gera histórico para os últimos 30 dias para os pontos de Andrey
    for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
      const baseDate = new Date(now);
      baseDate.setDate(baseDate.getDate() - dayOffset);

      // Leituras diárias normais no Cavalete (manhã, tarde, noite)
      const d1 = new Date(baseDate); d1.setHours(7, 30, 0, 0);
      addLeitura('pto_cavalete', 65.50 + (Math.sin(dayOffset) * 12), d1, dayOffset === 0 ? 'sensor_iot' : 'simulada_teste');

      const d2 = new Date(baseDate); d2.setHours(12, 45, 0, 0);
      addLeitura('pto_cavalete', 85.20 + (Math.cos(dayOffset) * 15), d2, 'simulada_teste');

      const d3 = new Date(baseDate); d3.setHours(19, 15, 0, 0);
      addLeitura('pto_cavalete', 110.40 + (Math.sin(dayOffset * 2) * 20), d3, dayOffset < 3 ? 'manual' : 'simulada_teste');

      // Leituras na Cozinha
      const c1 = new Date(baseDate); c1.setHours(8, 0, 0, 0);
      addLeitura('pto_cozinha', 24.50 + Math.random() * 8, c1, 'simulada_teste');

      const c2 = new Date(baseDate); c2.setHours(13, 10, 0, 0);
      addLeitura('pto_cozinha', 48.00 + Math.random() * 12, c2, 'simulada_teste');

      const c3 = new Date(baseDate); c3.setHours(20, 30, 0, 0);
      addLeitura('pto_cozinha', 35.80 + Math.random() * 10, c3, 'simulada_teste');

      // Reservatório (medições periódicas de reposição)
      if (dayOffset % 2 === 0) {
        const r1 = new Date(baseDate); r1.setHours(15, 0, 0, 0);
        addLeitura('pto_reservatorio', 180.00 + Math.random() * 30, r1, 'simulada_teste');
      }
    }

    // Cenário de Anomalia 1 (RF09 - Fluxo Contínuo Madrugada 01:00 às 05:00 >= 120min):
    // Injetamos 6 leituras contínuas nesta madrugada no Cavalete Principal (intervalos de 30 min = 150 min contínuos!)
    const todayDawn = new Date(now);
    [
      { h: 1, m: 15, vol: 14.50 },
      { h: 1, m: 45, vol: 15.20 },
      { h: 2, m: 15, vol: 13.80 },
      { h: 2, m: 45, vol: 14.10 },
      { h: 3, m: 15, vol: 15.00 },
      { h: 3, m: 45, vol: 14.60 }
    ].forEach(item => {
      todayDawn.setHours(item.h, item.m, 0, 0);
      addLeitura('pto_cavalete', item.vol, new Date(todayDawn), 'simulada_teste');
    });

    // Cenário de Anomalia 2 (RF09 - Consumo Acima da Média):
    // Injetamos hoje um pico excessivo na Cozinha (dia com 520L vs média diária de ~105L)
    const todayNoon = new Date(now);
    todayNoon.setHours(14, 0, 0, 0);
    addLeitura('pto_cozinha', 280.00, todayNoon, 'manual');
    const todayAfternoon = new Date(now);
    todayAfternoon.setHours(16, 30, 0, 0);
    addLeitura('pto_cozinha', 160.00, todayAfternoon, 'manual');

    // 4. Alertas Pré-gerados (RF10, RF11)
    const alertas = [
      {
        id: 'alt_noturno_1',
        ponto_monitoramento_id: 'pto_cavalete',
        leitura_referencia_id: 'lei_1',
        tipo: 'fluxo_continuo_madrugada',
        descricao: 'Detectado fluxo contínuo de água na madrugada (01:15 às 03:45) por 150 minutos ininterruptos. Volume total medido de 87,20 litros. Recomendamos verificar se há válvulas de descarga travadas, torneiras gotejando ou vazamentos na tubulação.',
        status: 'pendente',
        criado_em: new Date(now.getTime() - 3 * 3600 * 1000).toISOString()
      },
      {
        id: 'alt_pico_1',
        ponto_monitoramento_id: 'pto_cozinha',
        leitura_referencia_id: 'lei_2',
        tipo: 'consumo_acima_media',
        descricao: 'O volume acumulado de hoje na Cozinha & Área Gourmet ultrapassou em 145% a média histórica dos últimos 7 dias. Verifique se o registro foi deixado aberto ou se houve enchimento extraordinário de tanques.',
        status: 'reconhecido',
        criado_em: new Date(now.getTime() - 1 * 3600 * 1000).toISOString()
      },
      {
        id: 'alt_historico_resolvido',
        ponto_monitoramento_id: 'pto_reservatorio',
        leitura_referencia_id: null,
        tipo: 'fluxo_continuo_madrugada',
        descricao: 'Fluxo contínuo registrado há 5 dias durante a madrugada. A boia mecânica da caixa d\'água foi substituída e o sistema normalizado.',
        status: 'resolvido',
        criado_em: new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString()
      }
    ];

    const initialData = {
      usuarios,
      pontos_monitoramento,
      leituras_consumo,
      alertas,
      metadata: {
        last_seeded: new Date().toISOString(),
        version: window.CONFIG?.VERSION || '1.0.0'
      }
    };

    this.saveRawData(initialData);
    return initialData;
  }

  // --- MÉTODOS DE USUÁRIOS (RF01, RF02, RF03, RF14) ---
  getUsers() {
    const data = this.getRawData() || this.seedDefaultData();
    return data.usuarios || [];
  }

  getUserById(id) {
    return this.getUsers().find(u => u.id === id) || null;
  }

  getUserByEmail(email) {
    if (!email) return null;
    return this.getUsers().find(u => u.email.toLowerCase() === email.trim().toLowerCase()) || null;
  }

  createUser(userData) {
    const data = this.getRawData() || this.seedDefaultData();
    const emailExists = data.usuarios.some(u => u.email.toLowerCase() === userData.email.trim().toLowerCase());
    if (emailExists) {
      throw new Error('Já existe um usuário cadastrado com este e-mail.');
    }

    const newUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      nome: userData.nome.trim(),
      email: userData.email.trim().toLowerCase(),
      senha_hash: userData.senha, // Simulado
      papel: userData.papel || 'cliente',
      instituicao: userData.instituicao || 'Usuário Cadastrado',
      ativo: true,
      criado_em: new Date().toISOString()
    };

    data.usuarios.push(newUser);
    this.saveRawData(data);
    return newUser;
  }

  // --- MÉTODOS DE PONTOS DE MONITORAMENTO (RF04, RF05, RF12, RF13) ---
  getPointsByUser(userId) {
    const data = this.getRawData() || this.seedDefaultData();
    if (!userId) return [];
    return (data.pontos_monitoramento || []).filter(p => p.usuario_id === userId);
  }

  getAllPoints() {
    const data = this.getRawData() || this.seedDefaultData();
    return data.pontos_monitoramento || [];
  }

  getPointById(pointId) {
    const data = this.getRawData() || this.seedDefaultData();
    return (data.pontos_monitoramento || []).find(p => p.id === pointId) || null;
  }

  createPoint(pointData, userId) {
    if (!pointData.nome || !pointData.nome.trim()) {
      throw new Error('O nome do ponto de monitoramento é obrigatório.');
    }

    const data = this.getRawData() || this.seedDefaultData();
    const newPoint = {
      id: 'pto_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      usuario_id: userId,
      nome: pointData.nome.trim(),
      localizacao_descritiva: (pointData.localizacao_descritiva || '').trim(),
      ativo: pointData.ativo !== undefined ? Boolean(pointData.ativo) : true,
      criado_em: new Date().toISOString()
    };

    data.pontos_monitoramento.push(newPoint);
    this.saveRawData(data);
    return newPoint;
  }

  updatePoint(pointId, updateData, userId) {
    const data = this.getRawData() || this.seedDefaultData();
    const index = data.pontos_monitoramento.findIndex(p => p.id === pointId);
    if (index === -1) {
      throw new Error('Ponto de monitoramento não encontrado.');
    }

    // Isolamento multiusuário (RF13): somente o dono ou admin pode alterar
    if (data.pontos_monitoramento[index].usuario_id !== userId) {
      throw new Error('Você não tem permissão para alterar este ponto de monitoramento.');
    }

    if (updateData.nome !== undefined) {
      if (!updateData.nome.trim()) throw new Error('O nome do ponto não pode ser vazio.');
      data.pontos_monitoramento[index].nome = updateData.nome.trim();
    }

    if (updateData.localizacao_descritiva !== undefined) {
      data.pontos_monitoramento[index].localizacao_descritiva = updateData.localizacao_descritiva.trim();
    }

    if (updateData.ativo !== undefined) {
      data.pontos_monitoramento[index].ativo = Boolean(updateData.ativo);
    }

    this.saveRawData(data);
    return data.pontos_monitoramento[index];
  }

  togglePointStatus(pointId, userId) {
    const point = this.getPointById(pointId);
    if (!point) throw new Error('Ponto não encontrado.');
    return this.updatePoint(pointId, { ativo: !point.ativo }, userId);
  }

  // --- MÉTODOS DE LEITURAS DE CONSUMO (RF06, RF08, RF12, RF15) ---
  getAllReadings() {
    const data = this.getRawData() || this.seedDefaultData();
    return data.leituras_consumo || [];
  }

  getReadingsByPoint(pointId) {
    const readings = this.getAllReadings();
    return readings
      .filter(r => r.ponto_monitoramento_id === pointId)
      .sort((a, b) => new Date(b.registrado_em) - new Date(a.registrado_em));
  }

  getReadingsByUser(userId) {
    const userPoints = this.getPointsByUser(userId).map(p => p.id);
    const readings = this.getAllReadings();
    return readings
      .filter(r => userPoints.includes(r.ponto_monitoramento_id))
      .sort((a, b) => new Date(b.registrado_em) - new Date(a.registrado_em));
  }

  createReading(readingData) {
    // Validação de integridade referencial (RF12)
    const point = this.getPointById(readingData.ponto_monitoramento_id);
    if (!point) {
      throw new Error('Ponto de monitoramento associado é inválido ou inexistente.');
    }

    const volume = parseFloat(readingData.volume_litros);
    if (isNaN(volume) || volume <= 0) {
      throw new Error('O volume consumido deve ser um valor numérico positivo.');
    }

    const allowedOrigins = [
      window.CONFIG?.ORIGINS?.MANUAL || 'manual',
      window.CONFIG?.ORIGINS?.SIMULATED || 'simulada_teste',
      window.CONFIG?.ORIGINS?.IOT_SENSOR || 'sensor_iot'
    ];
    const origem = allowedOrigins.includes(readingData.origem_dado) ? readingData.origem_dado : 'manual';

    const timestamp = readingData.registrado_em ? new Date(readingData.registrado_em).toISOString() : new Date().toISOString();

    const newReading = {
      id: 'lei_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ponto_monitoramento_id: readingData.ponto_monitoramento_id,
      volume_litros: parseFloat(volume.toFixed(2)),
      origem_dado: origem,
      registrado_em: timestamp
    };

    const data = this.getRawData() || this.seedDefaultData();
    data.leituras_consumo.push(newReading);
    this.saveRawData(data);

    // Retorna a nova leitura gravada
    return newReading;
  }

  createBulkReadings(readingsArray) {
    const data = this.getRawData() || this.seedDefaultData();
    readingsArray.forEach(r => {
      data.leituras_consumo.push({
        id: 'lei_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        ponto_monitoramento_id: r.ponto_monitoramento_id,
        volume_litros: parseFloat(parseFloat(r.volume_litros).toFixed(2)),
        origem_dado: r.origem_dado || 'simulada_teste',
        registrado_em: r.registrado_em ? new Date(r.registrado_em).toISOString() : new Date().toISOString()
      });
    });
    this.saveRawData(data);
    return true;
  }

  // --- MÉTODOS DE ALERTAS (RF10, RF11, RF12, RF13) ---
  getAllAlerts() {
    const data = this.getRawData() || this.seedDefaultData();
    return data.alertas || [];
  }

  getAlertsByUser(userId) {
    const userPoints = this.getPointsByUser(userId).map(p => p.id);
    const alerts = this.getAllAlerts();
    return alerts
      .filter(a => userPoints.includes(a.ponto_monitoramento_id))
      .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
  }

  getAlertsByPoint(pointId) {
    return this.getAllAlerts()
      .filter(a => a.ponto_monitoramento_id === pointId)
      .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
  }

  createAlert(alertData) {
    const point = this.getPointById(alertData.ponto_monitoramento_id);
    if (!point) {
      throw new Error('Ponto de monitoramento inexistente para vinculação do alerta.');
    }

    const data = this.getRawData() || this.seedDefaultData();
    const newAlert = {
      id: 'alt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ponto_monitoramento_id: alertData.ponto_monitoramento_id,
      leitura_referencia_id: alertData.leitura_referencia_id || null,
      tipo: alertData.tipo,
      descricao: alertData.descricao,
      status: alertData.status || 'pendente',
      criado_em: alertData.criado_em || new Date().toISOString()
    };

    data.alertas.unshift(newAlert);
    this.saveRawData(data);
    return newAlert;
  }

  updateAlertStatus(alertId, newStatus, userId) {
    const allowed = ['pendente', 'reconhecido', 'resolvido'];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Status de alerta inválido: ${newStatus}`);
    }

    const data = this.getRawData() || this.seedDefaultData();
    const alert = data.alertas.find(a => a.id === alertId);
    if (!alert) {
      throw new Error('Alerta não encontrado.');
    }

    // Validação de posse do ponto vinculado
    if (userId) {
      const userPoints = this.getPointsByUser(userId).map(p => p.id);
      const isOwner = userPoints.includes(alert.ponto_monitoramento_id);
      const user = this.getUserById(userId);
      if (!isOwner && user?.papel !== 'administrador') {
        throw new Error('Você não tem permissão para alterar este alerta.');
      }
    }

    alert.status = newStatus;
    this.saveRawData(data);
    return alert;
  }

  countPendingAlerts(userId) {
    return this.getAlertsByUser(userId).filter(a => a.status === 'pendente').length;
  }
}

// Inicializar e expor globalmente
window.db = new AguasmartDB();
