/**
 * ÁguaSmart — Camada de Apresentação e Componentes de Interface de Usuário
 * Renderiza:
 * - Dashboard com KPIs consolidados (24h, 7d, mês), gráficos Chart.js e alertas rápidos
 * - Gerenciamento de Pontos de Monitoramento (CRUD e ativação/inativação)
 * - Histórico de Leituras com filtros avançados, paginação e exportação CSV
 * - Central de Alertas com transição de status (Pendente -> Reconhecido -> Resolvido)
 * - Painel Administrativo restrito (RF14, CA16)
 * - Simulador Interativo IoT & Testes Acadêmicos (RF15, Seção 8.3)
 */

class UIManager {
  constructor() {
    this.chartInstances = {};
    this.currentHistoricoPage = 1;
    this.historicoPageSize = 15;
    this.historicoFilters = {
      pontoId: 'all',
      origem: 'all',
      dataInicio: '',
      dataFim: ''
    };
  }

  // --- SISTEMA DE NOTIFICAÇÕES TOAST ---
  showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg class="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg class="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
    } else if (type === 'warning') {
      iconSvg = '<svg class="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
    } else {
      iconSvg = '<svg class="w-5 h-5 text-sky-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    }

    toast.innerHTML = `
      ${iconSvg}
      <div class="flex-1 text-slate-800">${message}</div>
      <button class="text-slate-400 hover:text-slate-600 p-1" onclick="this.parentElement.remove()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // --- ATUALIZAÇÃO DO CABEÇALHO E SELETOR DE PONTOS ---
  updateHeader(user, selectedPointId) {
    const userBadge = document.getElementById('header-user-badge');
    const userRole = document.getElementById('header-user-role');
    const userEmail = document.getElementById('header-user-email');
    const pointSelector = document.getElementById('header-point-select');
    const alertsBadge = document.getElementById('nav-alerts-badge');

    if (user && userBadge) {
      userBadge.textContent = user.nome.split(' ')[0];
      if (userRole) {
        userRole.textContent = user.papel === 'administrador' ? 'Administrador' : 'Consumidor';
        userRole.className = user.papel === 'administrador'
          ? 'px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700'
          : 'px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-100 text-sky-700';
      }
      if (userEmail) userEmail.textContent = user.email;
    }

    // Atualiza opções do seletor de pontos
    if (pointSelector && user) {
      const userPoints = window.db.getPointsByUser(user.id);
      let optionsHtml = '<option value="all">📊 Todos os Pontos Ativos</option>';
      userPoints.forEach(p => {
        const isSelected = p.id === selectedPointId ? 'selected' : '';
        const statusTag = p.ativo ? '' : ' (Inativo)';
        optionsHtml += `<option value="${p.id}" ${isSelected}>💧 ${p.nome}${statusTag}</option>`;
      });
      pointSelector.innerHTML = optionsHtml;
    }

    // Atualiza contagem de alertas pendentes
    if (alertsBadge && user) {
      const pendingCount = window.db.countPendingAlerts(user.id);
      if (pendingCount > 0) {
        alertsBadge.textContent = pendingCount;
        alertsBadge.classList.remove('hidden');
      } else {
        alertsBadge.classList.add('hidden');
      }
    }
  }

  // ==========================================================================
  // 1. TELA: DASHBOARD
  // ==========================================================================
  renderDashboard(container, user, selectedPointId) {
    const summary = window.metricsService.getUserSummary(user.id, selectedPointId);
    const userAlerts = window.db.getAlertsByUser(user.id);
    const recentAlerts = userAlerts.slice(0, 3);
    const selectedPoint = selectedPointId && selectedPointId !== 'all' ? window.db.getPointById(selectedPointId) : null;

    container.innerHTML = `
      <div class="space-y-6 fade-in">
        <!-- Banner de Boas-vindas e Ações Rápidas -->
        <div class="bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-sky-100 mb-2">
                <span class="live-indicator"></span>
                <span>Sistema de Monitoramento Online • IFRO Campus Calama</span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Olá, ${user.nome.split(' ')[0]}! 👋
              </h1>
              <p class="text-sky-100 mt-1 max-w-xl text-sm sm:text-base">
                ${selectedPoint ? `Exibindo métricas detalhadas do ponto <strong>${selectedPoint.nome}</strong>.` : 'Acompanhe seu consumo hídrico em tempo real, previna vazamentos e economize.'}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2 sm:gap-3">
              <button onclick="window.app.openModal('modal-nova-leitura')" class="inline-flex items-center gap-2 bg-white text-sky-700 hover:bg-sky-50 font-semibold px-4 py-2.5 rounded-xl shadow transition text-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                Nova Leitura
              </button>
              <button onclick="window.app.executarVarredura()" class="inline-flex items-center gap-2 bg-sky-500/80 hover:bg-sky-500 text-white font-medium px-4 py-2.5 rounded-xl border border-white/30 backdrop-blur-sm transition text-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Checar Anomalias
              </button>
            </div>
          </div>
          <!-- Grafismo de fundo -->
          <div class="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        </div>

        <!-- Alerta Crítico em Destaque (se houver alerta pendente) -->
        ${summary.pendingAlertsCount > 0 ? `
          <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="live-indicator-danger"></span>
              <div>
                <h3 class="font-bold text-red-900 text-sm">Atenção: ${summary.pendingAlertsCount} alerta(s) preventivo(s) pendente(s) de verificação</h3>
                <p class="text-xs text-red-700">Detectamos comportamento atípico no fluxo hídrico. Confira para evitar desperdício de água potável.</p>
              </div>
            </div>
            <a href="#alertas" class="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition">
              Ver Alertas
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </a>
          </div>
        ` : ''}

        <!-- Cards de Indicadores Principais (KPIs - RF07) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Card 1: Consumo Diário (Últimas 24h) -->
          <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow transition">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Consumo Hoje (24h)</span>
              <div class="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
            </div>
            <div class="mt-3 flex items-baseline gap-2">
              <span class="text-3xl font-extrabold text-slate-900">${summary.daily.liters.toLocaleString('pt-BR')}</span>
              <span class="text-sm font-semibold text-slate-500">litros</span>
            </div>
            <div class="mt-2 flex items-center justify-between text-xs">
              <span class="text-slate-500">Custo: <strong class="text-slate-700">${summary.daily.cost}</strong></span>
              <span class="${summary.daily.changePercent > 0 ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}">
                ${summary.daily.changePercent > 0 ? `+${summary.daily.changePercent}%` : `${summary.daily.changePercent}%`} vs ontem
              </span>
            </div>
          </div>

          <!-- Card 2: Consumo Semanal (7 dias) -->
          <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow transition">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Últimos 7 Dias</span>
              <div class="w-9 h-9 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </div>
            </div>
            <div class="mt-3 flex items-baseline gap-2">
              <span class="text-3xl font-extrabold text-slate-900">${summary.weekly.liters.toLocaleString('pt-BR')}</span>
              <span class="text-sm font-semibold text-slate-500">litros</span>
            </div>
            <div class="mt-2 flex items-center justify-between text-xs">
              <span class="text-slate-500">Média: <strong class="text-slate-700">${summary.averageDaily7d.toLocaleString('pt-BR')} L/dia</strong></span>
              <span class="text-slate-600 font-medium">${summary.weekly.cost}</span>
            </div>
          </div>

          <!-- Card 3: Consumo Mensal (Mês Corrente) -->
          <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow transition">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Mês Corrente</span>
              <div class="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              </div>
            </div>
            <div class="mt-3 flex items-baseline gap-2">
              <span class="text-3xl font-extrabold text-slate-900">${summary.monthly.liters.toLocaleString('pt-BR')}</span>
              <span class="text-sm font-semibold text-slate-500">litros</span>
            </div>
            <div class="mt-2 flex items-center justify-between text-xs">
              <span class="text-slate-500">Fatura estimada: <strong class="text-slate-700">${summary.monthly.cost}</strong></span>
              <span class="text-sky-600 font-semibold">${(summary.monthly.liters / 1000).toFixed(2)} m³</span>
            </div>
          </div>

          <!-- Card 4: Projeção & Sustentabilidade ODS -->
          <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow transition">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Meta Sustentável</span>
              <div class="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
              </div>
            </div>
            <div class="mt-3 flex items-baseline gap-2">
              <span class="text-3xl font-extrabold text-emerald-600">ODS 6</span>
              <span class="text-xs font-semibold text-slate-500">Água Limpa</span>
            </div>
            <div class="mt-2 flex items-center justify-between text-xs">
              <span class="text-slate-500">Projeção Mês:</span>
              <span class="text-slate-700 font-bold">${summary.monthly.projectionCost}</span>
            </div>
          </div>
        </div>

        <!-- Seção de Gráficos Analíticos -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Gráfico Principal: Evolução de Consumo -->
          <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm lg:col-span-2">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 class="font-bold text-slate-800 text-base">Evolução de Consumo Hídrico</h3>
                <p class="text-xs text-slate-500">Acompanhamento temporal e identificação de padrões</p>
              </div>
              <!-- Alternador de Período do Gráfico -->
              <div class="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 self-start">
                <button id="btn-chart-24h" onclick="window.app.switchDashboardChart('24h')" class="px-3 py-1.5 rounded-lg bg-white text-sky-700 shadow-sm transition">
                  24 Horas
                </button>
                <button id="btn-chart-7d" onclick="window.app.switchDashboardChart('7d')" class="px-3 py-1.5 rounded-lg hover:text-slate-900 transition">
                  7 Dias
                </button>
                <button id="btn-chart-30d" onclick="window.app.switchDashboardChart('30d')" class="px-3 py-1.5 rounded-lg hover:text-slate-900 transition">
                  30 Dias
                </button>
              </div>
            </div>

            <div class="relative h-64 sm:h-72 w-full">
              <canvas id="dashboardConsumptionChart"></canvas>
            </div>
          </div>

          <!-- Gráfico Secundário: Distribuição por Ponto -->
          <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-slate-800 text-base">Distribuição por Ponto</h3>
                <span class="text-xs font-medium text-slate-500">Volume total</span>
              </div>
              <p class="text-xs text-slate-500 mb-4">Comparativo de consumo entre os pontos cadastrados</p>
              <div class="relative h-56 flex items-center justify-center">
                <canvas id="dashboardDistributionChart"></canvas>
              </div>
            </div>
            <div class="mt-4 pt-4 border-t border-slate-100 text-center">
              <a href="#pontos" class="text-xs font-semibold text-sky-600 hover:text-sky-700 inline-flex items-center gap-1">
                Gerenciar pontos de medição
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </a>
            </div>
          </div>
        </div>

        <!-- Seção Inferior: Alertas Recentes & Dicas Sustentáveis -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Feed de Alertas Recentes -->
          <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm lg:col-span-2">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  ⚠️
                </div>
                <div>
                  <h3 class="font-bold text-slate-800 text-base">Ocorrências e Alertas Preventivos</h3>
                  <p class="text-xs text-slate-500">Regras de anomalia executadas pelo sistema (RF09/RF10)</p>
                </div>
              </div>
              <a href="#alertas" class="text-xs font-semibold text-sky-600 hover:text-sky-700">Ver todos (${userAlerts.length})</a>
            </div>

            <div class="space-y-3">
              ${recentAlerts.length > 0 ? recentAlerts.map(alt => {
                const ponto = window.db.getPointById(alt.ponto_monitoramento_id);
                const dataFormatada = new Date(alt.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                return `
                  <div class="p-4 rounded-xl border ${alt.status === 'pendente' ? 'border-red-200 bg-red-50/50' : alt.status === 'reconhecido' ? 'border-amber-200 bg-amber-50/50' : 'border-emerald-200 bg-emerald-50/50'} flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="space-y-1">
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 text-xs font-bold rounded ${alt.tipo === 'fluxo_continuo_madrugada' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'}">
                          ${alt.tipo === 'fluxo_continuo_madrugada' ? '🌙 Fluxo Noturno Contínuo' : '📈 Consumo Acima da Média'}
                        </span>
                        <span class="text-xs font-semibold text-slate-600">• ${ponto ? ponto.nome : 'Ponto Desconhecido'}</span>
                        <span class="text-xs text-slate-400">• ${dataFormatada}</span>
                      </div>
                      <p class="text-xs text-slate-700 leading-relaxed">${alt.descricao}</p>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <span class="px-2.5 py-1 text-xs font-bold rounded-full ${alt.status === 'pendente' ? 'badge-status-pendente' : alt.status === 'reconhecido' ? 'badge-status-reconhecido' : 'badge-status-resolvido'}">
                        ${alt.status === 'pendente' ? 'Pendente' : alt.status === 'reconhecido' ? 'Reconhecido' : 'Resolvido'}
                      </span>
                      ${alt.status !== 'resolvido' ? `
                        <button onclick="window.app.mudarStatusAlerta('${alt.id}', 'resolvido')" class="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition" title="Marcar como Resolvido">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        </button>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('') : `
                <div class="text-center py-8 text-slate-400">
                  <p class="text-sm font-medium">Nenhum alerta registrado até o momento. Operação padrão!</p>
                </div>
              `}
            </div>
          </div>

          <!-- Painel Sustentabilidade & ODS -->
          <div class="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-6 border border-teal-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center gap-2 mb-3">
                <span class="text-2xl">🌱</span>
                <h3 class="font-bold text-teal-900 text-base">Impacto Sustentável</h3>
              </div>
              <p class="text-xs text-teal-800 leading-relaxed mb-4">
                O ÁguaSmart apoia os <strong>ODS 6 e 12 da ONU</strong> através da detecção precoce de vazamentos e da conscientização de consumo.
              </p>
              <div class="space-y-3">
                <div class="bg-white/80 p-3 rounded-xl border border-teal-100">
                  <span class="text-xs font-bold text-teal-900 block mb-1">💡 Dica Antidesperdício</span>
                  <p class="text-xs text-slate-600 leading-relaxed">
                    Uma torneira gotejando pode desperdiçar até <strong>46 litros de água por dia</strong> (1.380L/mês). Fique atento aos alertas noturnos!
                  </p>
                </div>
                <div class="bg-white/80 p-3 rounded-xl border border-teal-100">
                  <span class="text-xs font-bold text-teal-900 block mb-1">🎯 Economia Estimada</span>
                  <p class="text-xs text-slate-600 leading-relaxed">
                    Usuários que monitoram pontos ativos reduzem em média <strong>18% a 25%</strong> da fatura mensal após identificação de vazamentos.
                  </p>
                </div>
              </div>
            </div>
            <div class="mt-4 pt-3 border-t border-teal-200/60 text-xs text-teal-700 font-medium">
              Desenvolvido no âmbito do Simulado Centelha 3 — Rondônia
            </div>
          </div>
        </div>
      </div>
    `;

    // Renderiza gráficos
    this.renderDashboardCharts(user.id, selectedPointId, '24h');
  }

  // --- RENDERIZADOR DE GRÁFICOS DO DASHBOARD COM CHART.JS ---
  renderDashboardCharts(userId, selectedPointId, period = '24h') {
    // 1. Gráfico de Consumo Temporal
    const ctxMain = document.getElementById('dashboardConsumptionChart');
    if (ctxMain && window.Chart) {
      if (this.chartInstances.main) {
        this.chartInstances.main.destroy();
      }

      let chartData;
      let label = 'Consumo (Litros)';
      if (period === '24h') {
        chartData = window.metricsService.getHourlyChartData(userId, selectedPointId);
        label = 'Consumo por Hora (Litros)';
      } else if (period === '7d') {
        chartData = window.metricsService.getDaily7DaysChartData(userId, selectedPointId);
        label = 'Consumo Diário (Litros)';
      } else {
        chartData = window.metricsService.getDaily30DaysChartData(userId, selectedPointId);
        label = 'Consumo Diário nos Últimos 30 Dias (Litros)';
      }

      this.chartInstances.main = new Chart(ctxMain, {
        type: 'line',
        data: {
          labels: chartData.labels,
          datasets: [{
            label: label,
            data: chartData.values,
            borderColor: '#0284c7',
            backgroundColor: 'rgba(2, 132, 199, 0.1)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointBackgroundColor: '#0284c7',
            pointRadius: period === '30d' ? 2 : 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => ` ${context.parsed.y.toLocaleString('pt-BR')} litros`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(226, 232, 240, 0.6)' },
              ticks: {
                callback: (val) => `${val} L`,
                font: { size: 11 }
              }
            },
            x: {
              grid: { display: false },
              ticks: {
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: period === '30d' ? 10 : 12,
                font: { size: 10 }
              }
            }
          }
        }
      });
    }

    // 2. Gráfico de Rosca de Distribuição por Ponto
    const ctxDist = document.getElementById('dashboardDistributionChart');
    if (ctxDist && window.Chart) {
      if (this.chartInstances.dist) {
        this.chartInstances.dist.destroy();
      }

      const distData = window.metricsService.getDistributionByPointData(userId);

      this.chartInstances.dist = new Chart(ctxDist, {
        type: 'doughnut',
        data: {
          labels: distData.labels,
          datasets: [{
            data: distData.values,
            backgroundColor: distData.colors,
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 12, font: { size: 10 } }
            },
            tooltip: {
              callbacks: {
                label: (context) => ` ${context.label}: ${context.parsed.toLocaleString('pt-BR')} L`
              }
            }
          },
          cutout: '65%'
        }
      });
    }
  }

  // ==========================================================================
  // 2. TELA: GERENCIAMENTO DE PONTOS DE MONITORAMENTO (RF04, RF05, RF12, RF13)
  // ==========================================================================
  renderPontos(container, user) {
    const userPoints = window.db.getPointsByUser(user.id);
    const allReadings = window.db.getAllReadings();
    const allAlerts = window.db.getAllAlerts();

    container.innerHTML = `
      <div class="space-y-6 fade-in">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-extrabold text-slate-900">Pontos de Monitoramento</h1>
            <p class="text-sm text-slate-500">Cadastre e gerencie hidrômetros, cavaletes, caixas d'água e tubulações (RF04, RF05)</p>
          </div>
          <button onclick="window.app.openModal('modal-novo-ponto')" class="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow transition text-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            Novo Ponto de Medição
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${userPoints.length > 0 ? userPoints.map(p => {
            const pReadings = allReadings.filter(r => r.ponto_monitoramento_id === p.id);
            const totalLitros = pReadings.reduce((sum, r) => sum + r.volume_litros, 0);
            const pAlerts = allAlerts.filter(a => a.ponto_monitoramento_id === p.id && a.status === 'pendente');

            return `
              <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm point-card flex flex-col justify-between">
                <div>
                  <div class="flex items-start justify-between gap-3 mb-3">
                    <div class="flex items-center gap-2.5">
                      <div class="w-10 h-10 rounded-xl ${p.ativo ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400'} flex items-center justify-center font-bold">
                        💧
                      </div>
                      <div>
                        <h3 class="font-bold text-slate-900 text-base">${p.nome}</h3>
                        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${p.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">
                          <span class="w-1.5 h-1.5 rounded-full ${p.ativo ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
                          ${p.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                    ${pAlerts.length > 0 ? `
                      <span class="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200" title="${pAlerts.length} alerta(s) pendente(s)">
                        ⚠️ ${pAlerts.length}
                      </span>
                    ` : ''}
                  </div>

                  <p class="text-xs text-slate-600 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <strong class="text-slate-700">Localização:</strong> ${p.localizacao_descritiva || 'Não especificada'}
                  </p>

                  <div class="grid grid-cols-2 gap-3 mb-4 text-center">
                    <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span class="text-xs text-slate-500 block">Total Consumido</span>
                      <strong class="text-sm font-extrabold text-slate-900">${totalLitros.toLocaleString('pt-BR')} L</strong>
                    </div>
                    <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span class="text-xs text-slate-500 block">Leituras Salvas</span>
                      <strong class="text-sm font-extrabold text-slate-900">${pReadings.length}</strong>
                    </div>
                  </div>
                </div>

                <div class="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button onclick="window.app.togglePoint('${p.id}')" class="text-xs font-semibold px-3 py-1.5 rounded-lg border ${p.ativo ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'} transition">
                    ${p.ativo ? 'Inativar' : 'Reativar'}
                  </button>
                  <div class="flex items-center gap-1.5">
                    <button onclick="window.app.abrirEditarPonto('${p.id}')" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition">
                      Editar
                    </button>
                    <button onclick="window.app.filtrarHistoricoPorPonto('${p.id}')" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 transition">
                      Histórico
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('') : `
            <div class="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
              <span class="text-4xl block mb-2">💧</span>
              <h3 class="text-base font-bold text-slate-800">Nenhum ponto cadastrado</h3>
              <p class="text-xs text-slate-500 mt-1 mb-4">Adicione seu primeiro hidrômetro ou cavalete para iniciar o acompanhamento.</p>
              <button onclick="window.app.openModal('modal-novo-ponto')" class="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-4 py-2 rounded-xl text-xs">
                Cadastrar Ponto Agora
              </button>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // 3. TELA: HISTÓRICO DE LEITURAS (RF06, RF08, RF15, CA08, CA09, CA10)
  // ==========================================================================
  renderHistorico(container, user) {
    const userPoints = window.db.getPointsByUser(user.id);
    let allUserReadings = window.db.getReadingsByUser(user.id);

    // Aplica Filtros (RF08, CA10)
    if (this.historicoFilters.pontoId !== 'all') {
      allUserReadings = allUserReadings.filter(r => r.ponto_monitoramento_id === this.historicoFilters.pontoId);
    }

    if (this.historicoFilters.origem !== 'all') {
      allUserReadings = allUserReadings.filter(r => r.origem_dado === this.historicoFilters.origem);
    }

    if (this.historicoFilters.dataInicio) {
      allUserReadings = allUserReadings.filter(r => r.registrado_em.split('T')[0] >= this.historicoFilters.dataInicio);
    }

    if (this.historicoFilters.dataFim) {
      allUserReadings = allUserReadings.filter(r => r.registrado_em.split('T')[0] <= this.historicoFilters.dataFim);
    }

    // Paginação (RF08, RNF09 - máximo 50 por página)
    const totalRecords = allUserReadings.length;
    const totalPages = Math.ceil(totalRecords / this.historicoPageSize) || 1;
    if (this.currentHistoricoPage > totalPages) this.currentHistoricoPage = totalPages;

    const startIndex = (this.currentHistoricoPage - 1) * this.historicoPageSize;
    const pageReadings = allUserReadings.slice(startIndex, startIndex + this.historicoPageSize);

    container.innerHTML = `
      <div class="space-y-6 fade-in">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-extrabold text-slate-900">Histórico de Medições</h1>
            <p class="text-sm text-slate-500">Consulte, filtre e audite todas as leituras registradas no sistema (RF06, RF08)</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="window.app.openModal('modal-nova-leitura')" class="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-3.5 py-2 rounded-xl text-xs shadow transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              Inserir Leitura
            </button>
            <button onclick="window.app.openModal('modal-simular-lote')" class="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-3.5 py-2 rounded-xl text-xs shadow transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              Injetar Dados Demo (RF15)
            </button>
            <button onclick="window.app.exportarHistoricoCSV()" class="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3.5 py-2 rounded-xl text-xs transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Exportar CSV
            </button>
          </div>
        </div>

        <!-- Barra de Filtros (CA10) -->
        <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Ponto de Medição</label>
            <select id="filtro-ponto" onchange="window.app.aplicarFiltroHistorico()" class="w-full text-xs rounded-xl border-slate-200 focus:ring-sky-500 focus:border-sky-500 bg-slate-50 p-2">
              <option value="all" ${this.historicoFilters.pontoId === 'all' ? 'selected' : ''}>Todos os Pontos</option>
              ${userPoints.map(p => `<option value="${p.id}" ${this.historicoFilters.pontoId === p.id ? 'selected' : ''}>${p.nome}</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Origem do Dado</label>
            <select id="filtro-origem" onchange="window.app.aplicarFiltroHistorico()" class="w-full text-xs rounded-xl border-slate-200 focus:ring-sky-500 focus:border-sky-500 bg-slate-50 p-2">
              <option value="all" ${this.historicoFilters.origem === 'all' ? 'selected' : ''}>Todas as Origens</option>
              <option value="manual" ${this.historicoFilters.origem === 'manual' ? 'selected' : ''}>Manual</option>
              <option value="simulada_teste" ${this.historicoFilters.origem === 'simulada_teste' ? 'selected' : ''}>Simulada / Teste</option>
              <option value="sensor_iot" ${this.historicoFilters.origem === 'sensor_iot' ? 'selected' : ''}>Sensor IoT</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Data Inicial (CA10)</label>
            <input type="date" id="filtro-data-inicio" value="${this.historicoFilters.dataInicio}" onchange="window.app.aplicarFiltroHistorico()" class="w-full text-xs rounded-xl border-slate-200 focus:ring-sky-500 focus:border-sky-500 bg-slate-50 p-2" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Data Final (CA10)</label>
            <input type="date" id="filtro-data-fim" value="${this.historicoFilters.dataFim}" onchange="window.app.aplicarFiltroHistorico()" class="w-full text-xs rounded-xl border-slate-200 focus:ring-sky-500 focus:border-sky-500 bg-slate-50 p-2" />
          </div>

          <div class="flex items-end gap-2">
            <button onclick="window.app.limparFiltrosHistorico()" class="w-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl transition">
              Limpar Filtros
            </button>
          </div>
        </div>

        <!-- Tabela Responsiva de Leituras -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <tr>
                  <th class="p-3.5">Data & Hora</th>
                  <th class="p-3.5">Ponto de Medição</th>
                  <th class="p-3.5 text-right">Volume Consumido</th>
                  <th class="p-3.5">Origem do Dado (RF06)</th>
                  <th class="p-3.5 text-center">Identificador</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${pageReadings.length > 0 ? pageReadings.map(r => {
                  const p = window.db.getPointById(r.ponto_monitoramento_id);
                  const dataFormatada = new Date(r.registrado_em).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  });

                  let badgeClass = 'badge-origem-manual';
                  let origemLabel = 'Manual';
                  if (r.origem_dado === 'simulada_teste') {
                    badgeClass = 'badge-origem-simulada';
                    origemLabel = 'Simulada / Teste';
                  } else if (r.origem_dado === 'sensor_iot') {
                    badgeClass = 'badge-origem-sensor';
                    origemLabel = 'Sensor IoT';
                  }

                  return `
                    <tr class="hover:bg-slate-50 transition">
                      <td class="p-3.5 font-medium text-slate-900">${dataFormatada}</td>
                      <td class="p-3.5 text-slate-700">${p ? p.nome : 'Ponto Inexistente'}</td>
                      <td class="p-3.5 text-right font-extrabold text-slate-900">${r.volume_litros.toFixed(2)} L</td>
                      <td class="p-3.5">
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}">
                          ${origemLabel}
                        </span>
                      </td>
                      <td class="p-3.5 text-center font-mono text-slate-400 text-2xs">${r.id}</td>
                    </tr>
                  `;
                }).join('') : `
                  <tr>
                    <td colspan="5" class="text-center py-8 text-slate-400">
                      Nenhuma leitura encontrada com os filtros informados.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- Controles de Paginação (RF08) -->
          <div class="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Exibindo <strong>${totalRecords > 0 ? startIndex + 1 : 0}</strong> a <strong>${Math.min(startIndex + this.historicoPageSize, totalRecords)}</strong> de <strong>${totalRecords}</strong> medições registradas
            </div>
            <div class="flex items-center gap-2">
              <button onclick="window.app.mudarPaginaHistorico(${this.currentHistoricoPage - 1})" ${this.currentHistoricoPage <= 1 ? 'disabled class="opacity-50 cursor-not-allowed"' : 'class="hover:bg-white"'} class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium transition">
                Anterior
              </button>
              <span class="font-semibold text-slate-800">Página ${this.currentHistoricoPage} de ${totalPages}</span>
              <button onclick="window.app.mudarPaginaHistorico(${this.currentHistoricoPage + 1})" ${this.currentHistoricoPage >= totalPages ? 'disabled class="opacity-50 cursor-not-allowed"' : 'class="hover:bg-white"'} class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium transition">
                Próxima
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // 4. TELA: ALERTAS E ANOMALIAS (RF09, RF10, RF11, CA12, CA13, CA14)
  // ==========================================================================
  renderAlertas(container, user) {
    const userAlerts = window.db.getAlertsByUser(user.id);
    const pendingCount = userAlerts.filter(a => a.status === 'pendente').length;
    const recognizedCount = userAlerts.filter(a => a.status === 'reconhecido').length;
    const resolvedCount = userAlerts.filter(a => a.status === 'resolvido').length;

    container.innerHTML = `
      <div class="space-y-6 fade-in">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-extrabold text-slate-900">Alertas de Consumo & Anomalias</h1>
            <p class="text-sm text-slate-500">Detecção determinística de vazamentos noturnos e picos anormais (RF09, RF10, RF11)</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="window.app.executarVarredura()" class="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-3.5 py-2 rounded-xl text-xs shadow transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Executar Varredura
            </button>
            <button onclick="window.app.simularVazamentoMadrugada()" class="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-3.5 py-2 rounded-xl text-xs shadow transition" title="Dispara a regra de fluxo noturno >= 120min">
              🌙 Simular Vazamento Noturno (CA12)
            </button>
            <button onclick="window.app.simularPicoConsumo()" class="inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-3.5 py-2 rounded-xl text-xs shadow transition" title="Dispara a regra de consumo +50% acima da média">
              📈 Simular Pico de Consumo (CA13)
            </button>
          </div>
        </div>

        <!-- Badges de Status -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-red-50 p-4 rounded-2xl border border-red-200">
            <span class="text-xs font-bold text-red-700 uppercase tracking-wider block">Pendentes de Ação</span>
            <span class="text-2xl font-extrabold text-red-900 mt-1 block">${pendingCount}</span>
            <span class="text-xs text-red-600">Requerem inspeção física no local</span>
          </div>
          <div class="bg-amber-50 p-4 rounded-2xl border border-amber-200">
            <span class="text-xs font-bold text-amber-700 uppercase tracking-wider block">Reconhecidos</span>
            <span class="text-2xl font-extrabold text-amber-900 mt-1 block">${recognizedCount}</span>
            <span class="text-xs text-amber-600">Em análise pelo responsável</span>
          </div>
          <div class="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
            <span class="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Resolvidos</span>
            <span class="text-2xl font-extrabold text-emerald-900 mt-1 block">${resolvedCount}</span>
            <span class="text-xs text-emerald-600">Problemas corrigidos com sucesso</span>
          </div>
        </div>

        <!-- Lista Detalhada de Alertas -->
        <div class="space-y-4">
          ${userAlerts.length > 0 ? userAlerts.map(alt => {
            const ponto = window.db.getPointById(alt.ponto_monitoramento_id);
            const dataFormatada = new Date(alt.criado_em).toLocaleDateString('pt-BR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            });

            return `
              <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="space-y-2 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="px-2.5 py-1 text-xs font-bold rounded-lg ${alt.tipo === 'fluxo_continuo_madrugada' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'}">
                      ${alt.tipo === 'fluxo_continuo_madrugada' ? '🌙 Fluxo Contínuo na Madrugada (01h-05h)' : '📈 Consumo Diário Acima da Média (+50%)'}
                    </span>
                    <span class="text-xs font-semibold text-slate-700">Ponto: <strong>${ponto ? ponto.nome : 'Ponto Removido'}</strong></span>
                    <span class="text-xs text-slate-400">• ${dataFormatada}</span>
                  </div>

                  <p class="text-xs text-slate-700 leading-relaxed">${alt.descricao}</p>

                  <div class="flex items-center gap-3 pt-1 text-xs text-slate-500">
                    <span>Status Atual:</span>
                    <span class="px-2 py-0.5 rounded-full font-bold ${alt.status === 'pendente' ? 'badge-status-pendente' : alt.status === 'reconhecido' ? 'badge-status-reconhecido' : 'badge-status-resolvido'}">
                      ${alt.status.toUpperCase()}
                    </span>
                    ${alt.leitura_referencia_id ? `<span class="font-mono text-slate-400 text-2xs">Ref: ${alt.leitura_referencia_id}</span>` : ''}
                  </div>
                </div>

                <!-- Botões de Ação de Transição de Status (RF11, CA14) -->
                <div class="flex flex-wrap items-center gap-2 self-start md:self-center">
                  ${alt.status === 'pendente' ? `
                    <button onclick="window.app.mudarStatusAlerta('${alt.id}', 'reconhecido')" class="text-xs font-semibold px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition">
                      Reconhecer Alerta
                    </button>
                    <button onclick="window.app.mudarStatusAlerta('${alt.id}', 'resolvido')" class="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow transition">
                      Marcar Resolvido
                    </button>
                  ` : alt.status === 'reconhecido' ? `
                    <button onclick="window.app.mudarStatusAlerta('${alt.id}', 'resolvido')" class="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow transition">
                      Marcar Resolvido
                    </button>
                  ` : `
                    <button onclick="window.app.mudarStatusAlerta('${alt.id}', 'pendente')" class="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition">
                      Reabrir Alerta
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('') : `
            <div class="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
              <span class="text-4xl block mb-2">✅</span>
              <h3 class="text-base font-bold text-slate-800">Tudo calmo e regular!</h3>
              <p class="text-xs text-slate-500 mt-1 mb-4">Nenhuma anomalia de fluxo contínuo ou pico excessivo detectada nos seus pontos.</p>
              <button onclick="window.app.simularVazamentoMadrugada()" class="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-xl text-xs">
                Simular Detecção de Teste
              </button>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // 5. TELA: PAINEL ADMINISTRATIVO (RF14, CA16)
  // ==========================================================================
  renderAdmin(container, user) {
    // Verificação estrita de papel no servidor/serviço (RNF05, CA16)
    if (user.papel !== 'administrador') {
      container.innerHTML = `
        <div class="max-w-md mx-auto text-center py-16 px-6 bg-white rounded-2xl border border-red-200 shadow-sm fade-in">
          <div class="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            🚫
          </div>
          <h2 class="text-xl font-extrabold text-slate-900 mb-2">Acesso Restrito ao Administrador (CA16)</h2>
          <p class="text-xs text-slate-600 mb-6 leading-relaxed">
            Conforme a especificação do sistema (RF13, RF14 e RNF05), usuários com perfil comum (<strong>${user.nome}</strong>) não possuem privilégios para acessar métricas globais e gerenciamento de contas.
          </p>
          <div class="space-y-3">
            <button onclick="window.app.loginAsAdmin()" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition">
              Entrar como Administrador Geral (Demo)
            </button>
            <a href="#dashboard" class="inline-block text-xs font-semibold text-sky-600 hover:text-sky-700">
              Voltar ao Meu Dashboard
            </a>
          </div>
        </div>
      `;
      return;
    }

    const metrics = window.metricsService.getAdminMetrics();
    const allUsers = window.db.getUsers();

    container.innerHTML = `
      <div class="space-y-6 fade-in">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 mb-1">
              Área Restrita • Papel: Administrador
            </div>
            <h1 class="text-2xl font-extrabold text-slate-900">Painel Operacional do Sistema (RF14)</h1>
            <p class="text-sm text-slate-500">Métricas consolidadas de infraestrutura, usuários e auditoria de consumo</p>
          </div>
          <button onclick="window.app.resetarBancoDeDados()" class="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold px-3.5 py-2 rounded-xl text-xs transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            Restaurar Massa Padrão de Testes
          </button>
        </div>

        <!-- Cards Globais de Infraestrutura -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Total de Usuários</span>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-3xl font-extrabold text-slate-900">${metrics.totalUsers}</span>
              <span class="text-xs text-emerald-600 font-semibold">${metrics.activeUsers} ativos</span>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Pontos Monitorados</span>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-3xl font-extrabold text-slate-900">${metrics.totalPoints}</span>
              <span class="text-xs text-slate-500">${metrics.activePoints} operando</span>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Volume Total Medido</span>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-3xl font-extrabold text-slate-900">${metrics.totalCubicMeters}</span>
              <span class="text-xs font-semibold text-slate-500">m³ (${metrics.totalLiters.toLocaleString('pt-BR')} L)</span>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Alertas Emitidos</span>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="text-3xl font-extrabold text-slate-900">${metrics.totalAlerts}</span>
              <span class="text-xs text-red-600 font-semibold">${metrics.pendingAlerts} pendentes</span>
            </div>
          </div>
        </div>

        <!-- Tabela de Contas de Usuários -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div class="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 class="font-bold text-slate-900 text-sm">Contas Cadastradas na Plataforma</h3>
            <span class="text-xs text-slate-500 font-medium">${allUsers.length} registros</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <tr>
                  <th class="p-3.5">Nome / Instituição</th>
                  <th class="p-3.5">E-mail</th>
                  <th class="p-3.5">Papel</th>
                  <th class="p-3.5">Pontos Vinculados</th>
                  <th class="p-3.5">Cadastro</th>
                  <th class="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${allUsers.map(u => {
                  const pCount = window.db.getPointsByUser(u.id).length;
                  const dataCriacao = new Date(u.criado_em).toLocaleDateString('pt-BR');
                  return `
                    <tr class="hover:bg-slate-50 transition">
                      <td class="p-3.5">
                        <strong class="text-slate-900 block">${u.nome}</strong>
                        <span class="text-slate-500 text-2xs">${u.instituicao || '-'}</span>
                      </td>
                      <td class="p-3.5 font-mono text-slate-600">${u.email}</td>
                      <td class="p-3.5">
                        <span class="px-2 py-0.5 rounded-full font-bold text-2xs ${u.papel === 'administrador' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}">
                          ${u.papel.toUpperCase()}
                        </span>
                      </td>
                      <td class="p-3.5 font-semibold text-slate-700">${pCount} ponto(s)</td>
                      <td class="p-3.5 text-slate-500">${dataCriacao}</td>
                      <td class="p-3.5 text-center">
                        <span class="px-2 py-0.5 rounded-full text-2xs font-bold ${u.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">
                          ${u.ativo ? 'Ativo' : 'Suspenso'}
                        </span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // 6. TELA: SIMULADOR IOT & AMBIENTE ACADÊMICO (RF15, Seção 8.3)
  // ==========================================================================
  renderSimulador(container, user) {
    const userPoints = window.db.getPointsByUser(user.id);

    container.innerHTML = `
      <div class="space-y-6 fade-in">
        <div class="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
          <div class="inline-flex items-center gap-2 bg-indigo-500/30 px-3 py-1 rounded-full text-xs font-semibold text-indigo-200 mb-2">
            <span>🔬 Laboratório de Demonstração Acadêmica • Spec-Driven Development</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">Simulador de Telemetria IoT & Testes</h1>
          <p class="text-slate-300 mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed">
            Como especificado na <strong>Seção 8.3 do spec.md</strong>, o protótipo funcional permite simular a telemetria do microcontrolador ESP32 e sensores de fluxo YF-S201, permitindo à banca e aos professores validar todas as regras do sistema com 1 clique.
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Card de Simulação de Telemetria ESP32 / Sensor YF-S201 -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center gap-2 mb-3">
                <span class="text-2xl">📡</span>
                <div>
                  <h3 class="font-bold text-slate-900 text-base">Emulador de Telemetria IoT (ESP32)</h3>
                  <p class="text-xs text-slate-500">Geração de pacotes JSON simulando requisição <code>POST /api/telemetria</code></p>
                </div>
              </div>

              <div class="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-2xs mb-4 overflow-x-auto">
                <div class="text-slate-400 mb-1">// Exemplo de payload enviado pelo microcontrolador:</div>
                <pre>{
  "device_id": "esp32_hidro_01",
  "ponto_id": "${userPoints[0]?.id || 'pto_cavalete'}",
  "volume_litros": 18.45,
  "pulso_contagem": 830,
  "origem_dado": "sensor_iot",
  "timestamp": "${new Date().toISOString()}"
}</pre>
              </div>

              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Ponto Destino da Telemetria</label>
                  <select id="sim-ponto-iot" class="w-full text-xs rounded-xl border-slate-200 bg-slate-50 p-2.5">
                    ${userPoints.map(p => `<option value="${p.id}">${p.nome}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Volume a Injetar (Litros)</label>
                  <input type="number" id="sim-volume-iot" value="25.50" step="0.5" min="0.1" class="w-full text-xs rounded-xl border-slate-200 bg-slate-50 p-2.5" />
                </div>
              </div>
            </div>

            <div class="mt-6 pt-4 border-t border-slate-100">
              <button onclick="window.app.dispararTelemetriaIoT()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-xs shadow transition">
                Enviar Pacote de Telemetria IoT (tag: sensor_iot)
              </button>
            </div>
          </div>

          <!-- Card de Teste das Regras de Anomalia (CA12 e CA13) -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center gap-2 mb-3">
                <span class="text-2xl">🧪</span>
                <div>
                  <h3 class="font-bold text-slate-900 text-base">Validação dos Critérios de Aceite</h3>
                  <p class="text-xs text-slate-500">Teste determinístico das regras descritas nos itens CA12 e CA13</p>
                </div>
              </div>

              <div class="space-y-3 mb-4">
                <div class="p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <div class="flex items-center justify-between mb-1">
                    <strong class="text-xs text-purple-900">CA12 — Fluxo Noturno Contínuo (01h-05h)</strong>
                    <span class="text-2xs font-bold text-purple-700 bg-purple-200 px-2 py-0.5 rounded">>= 120 min</span>
                  </div>
                  <p class="text-2xs text-purple-800 leading-relaxed mb-2">
                    Injeta uma sequência de 5 leituras ininterruptas na madrugada e valida se o alerta <code>fluxo_continuo_madrugada</code> é registrado.
                  </p>
                  <button onclick="window.app.simularVazamentoMadrugada()" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg text-xs transition">
                    Executar Teste do CA12
                  </button>
                </div>

                <div class="p-3 bg-orange-50 rounded-xl border border-orange-200">
                  <div class="flex items-center justify-between mb-1">
                    <strong class="text-xs text-orange-900">CA13 — Pico Diário Acima da Média</strong>
                    <span class="text-2xs font-bold text-orange-700 bg-orange-200 px-2 py-0.5 rounded">+50% vs 7 dias</span>
                  </div>
                  <p class="text-2xs text-orange-800 leading-relaxed mb-2">
                    Injeta um volume elevado de água hoje para exceder em mais de 50% a média histórica dos últimos 7 dias.
                  </p>
                  <button onclick="window.app.simularPicoConsumo()" class="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 rounded-lg text-xs transition">
                    Executar Teste do CA13
                  </button>
                </div>
              </div>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Massa de dados persistida via LocalStorage</span>
              <button onclick="window.app.resetarBancoDeDados()" class="text-red-600 hover:text-red-700 font-semibold">
                Resetar Dados
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

// Expor globalmente
window.ui = new UIManager();
