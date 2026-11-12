/**
 * ÁguaSmart — Sistema Inteligente de Monitoramento de Água
 * Arquivo de Configurações e Constantes do Sistema
 * Referência: spec.md (Fase 1 — Spec-Driven Development)
 */

const CONFIG = {
  APP_NAME: 'ÁguaSmart',
  APP_SUBTITLE: 'Sistema Inteligente de Monitoramento de Água',
  VERSION: '1.0.0',
  INSTITUTION: 'Instituto Federal de Rondônia (IFRO) — Campus Porto Velho Calama',
  AUTHOR: 'Andrey Iago Costa Carvalho',
  PROJECT_CONTEXT: 'Simulado Centelha 3 — Rondônia | Desenvolvimento de Sistemas',
  ODS_GOALS: [
    { code: 'ODS 6', name: 'Água Potável e Saneamento', desc: 'Assegurar a disponibilidade e gestão sustentável da água.' },
    { code: 'ODS 12', name: 'Consumo e Produção Responsáveis', desc: 'Assegurar padrões de produção e de consumo sustentáveis.' }
  ],

  // Parâmetros econômicos e tarifários
  TARIFF_PER_M3: 5.20, // R$ por m³ (1 m³ = 1000 Litros)
  TARIFF_PER_LITER: 0.0052,

  // Regras de Detecção de Anomalias (RF09)
  ANOMALY_RULES: {
    // Regra 1: Fluxo noturno ininterrupto entre 01:00 e 05:00 >= 120 minutos
    NIGHT_FLOW: {
      START_HOUR: 1, // 01:00
      END_HOUR: 5,   // 05:00
      MIN_DURATION_MINUTES: 120, // 2 horas consecutivas
      TYPE: 'fluxo_continuo_madrugada',
      DEFAULT_DESCRIPTION: 'Identificado consumo ininterrupto de água durante a madrugada (entre 01:00 e 05:00) por período superior a 120 minutos. Recomendamos verificar torneiras, boias de caixas d\'água e bacias sanitárias para prevenir vazamentos ocultos.'
    },
    // Regra 2: Consumo diário consolidado >= 50% acima da média dos últimos 7 dias
    SPIKE_CONSUMPTION: {
      THRESHOLD_PERCENTAGE: 0.50, // +50%
      COMPARISON_DAYS: 7,
      TYPE: 'consumo_acima_media',
      DEFAULT_DESCRIPTION: 'O consumo consolidado hoje excedeu em mais de 50% a média histórica dos últimos 7 dias para este ponto de monitoramento. Verifique se houve utilização atípica ou tubulação rompida.'
    }
  },

  // Origens permitidas de medições (RF06, RF15, Seção 8.3)
  ORIGINS: {
    MANUAL: 'manual',
    SIMULATED: 'simulada_teste',
    IOT_SENSOR: 'sensor_iot'
  },

  // Status de Alertas (RF10, RF11)
  ALERT_STATUS: {
    PENDING: 'pendente',
    ACKNOWLEDGED: 'reconhecido',
    RESOLVED: 'resolvido'
  },

  // Papéis de Usuários (Seção 2, RF01, RF14)
  ROLES: {
    CLIENT: 'cliente',
    ADMIN: 'administrador'
  },

  // Paginação padrão do Histórico (RF08, RNF09)
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 15,
    OPTIONS: [10, 15, 25, 50]
  },

  STORAGE_KEY: 'aguasmart_system_db_v1'
};

// Exportar para escopo global do navegador
window.CONFIG = CONFIG;
