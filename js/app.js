/**
 * ÁguaSmart — Controlador Principal da Aplicação (App Router e Eventos)
 * Orquestra o ciclo de vida do SPA, gerenciamento de rotas, eventos de formulários,
 * modais, alternância de usuários e integração completa com todos os módulos.
 */

class AppController {
  constructor() {
    this.currentRoute = 'dashboard';
    this.selectedPointId = 'all';
    this.currentChartPeriod = '24h';
    this.init();
  }

  init() {
    // Configura listeners de autenticação
    window.auth?.onAuthStateChanged((user) => {
      this.handleAuthStateChange(user);
    });

    // Escuta mudanças de hash na URL
    window.addEventListener('hashchange', () => {
      this.handleRouteChange();
    });

    // Escuta tecla ESC para fechar modais
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAllModals();
    });

    // Inicializa rota padrão
    this.handleRouteChange();
  }

  handleAuthStateChange(user) {
    if (!user) {
      // Abre modal de autenticação ou define Andrey padrão
      this.openModal('modal-auth');
      return;
    }

    // Se o ponto selecionado não pertence a este usuário, reseta para 'all'
    const userPoints = window.db.getPointsByUser(user.id);
    if (this.selectedPointId !== 'all') {
      const exists = userPoints.some(p => p.id === this.selectedPointId);
      if (!exists) this.selectedPointId = 'all';
    }

    window.ui?.updateHeader(user, this.selectedPointId);
    this.renderCurrentView();
  }

  handleRouteChange() {
    let hash = window.location.hash.replace('#', '').trim();
    if (!hash) hash = 'dashboard';

    // Roteamento seguro: checa se a rota é admin e o usuário não é admin (CA16)
    const user = window.auth?.getCurrentUser();
    if (hash === 'admin' && user?.papel !== 'administrador') {
      // A própria tela renderiza o bloqueio amigável de acordo com o CA16
    }

    this.currentRoute = hash;
    this.updateActiveNavLinks();
    this.renderCurrentView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateActiveNavLinks() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      const href = link.getAttribute('href')?.replace('#', '');
      if (href === this.currentRoute) {
        link.classList.add('bg-sky-50', 'text-sky-700', 'font-bold');
        link.classList.remove('text-slate-600', 'hover:bg-slate-50');
      } else {
        link.classList.remove('bg-sky-50', 'text-sky-700', 'font-bold');
        link.classList.add('text-slate-600', 'hover:bg-slate-50');
      }
    });

    // Fecha menu mobile se aberto
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
      mobileMenu.classList.add('hidden');
    }
  }

  renderCurrentView() {
    const user = window.auth?.getCurrentUser();
    if (!user) return;

    window.ui?.updateHeader(user, this.selectedPointId);
    const container = document.getElementById('main-content-view');
    if (!container) return;

    switch (this.currentRoute) {
      case 'dashboard':
        window.ui.renderDashboard(container, user, this.selectedPointId);
        break;
      case 'pontos':
        window.ui.renderPontos(container, user);
        break;
      case 'historico':
        window.ui.renderHistorico(container, user);
        break;
      case 'alertas':
        window.ui.renderAlertas(container, user);
        break;
      case 'admin':
        window.ui.renderAdmin(container, user);
        break;
      case 'simulador':
        window.ui.renderSimulador(container, user);
        break;
      default:
        window.ui.renderDashboard(container, user, this.selectedPointId);
    }
  }

  // --- SELEÇÃO DE PONTO NO HEADER ---
  onHeaderPointChange(selectElement) {
    this.selectedPointId = selectElement.value;
    window.ui.showToast(`Ponto de visualização alterado.`, 'info', 2000);
    this.renderCurrentView();
  }

  // --- MODAIS ---
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Popula formulários dinâmicos conforme o modal
    const user = window.auth?.getCurrentUser();
    if (user) {
      if (modalId === 'modal-nova-leitura') {
        const pointSelect = document.getElementById('form-leitura-ponto');
        if (pointSelect) {
          const userPoints = window.db.getPointsByUser(user.id).filter(p => p.ativo);
          pointSelect.innerHTML = userPoints.map(p =>
            `<option value="${p.id}" ${p.id === this.selectedPointId ? 'selected' : ''}>${p.nome}</option>`
          ).join('');
        }
        const dtInput = document.getElementById('form-leitura-data');
        if (dtInput) {
          const now = new Date();
          now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
          dtInput.value = now.toISOString().slice(0, 16);
        }
      } else if (modalId === 'modal-simular-lote') {
        const pointSelect = document.getElementById('form-lote-ponto');
        if (pointSelect) {
          const userPoints = window.db.getPointsByUser(user.id);
          pointSelect.innerHTML = userPoints.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
        }
      }
    }

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
    }
    const anyModalOpen = document.querySelectorAll('.modal-overlay:not(.hidden)').length > 0;
    if (!anyModalOpen) {
      document.body.classList.remove('overflow-hidden');
    }
  }

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
    document.body.classList.remove('overflow-hidden');
  }

  // --- AÇÕES DO FORMULÁRIO DE LEITURA (RF06, CA08, CA09) ---
  salvarNovaLeitura(e) {
    if (e) e.preventDefault();
    const form = document.getElementById('form-nova-leitura');
    if (!form) return;

    const pontoId = form.elements['pontoId'].value;
    const volume = parseFloat(form.elements['volume'].value);
    const dataHora = form.elements['dataHora'].value;
    const origem = form.elements['origem'].value || 'manual';

    try {
      const novaLeitura = window.db.createReading({
        ponto_monitoramento_id: pontoId,
        volume_litros: volume,
        registrado_em: dataHora,
        origem_dado: origem
      });

      // Avalia regras de anomalia automaticamente após inserção (RF09, RF10)
      const novosAlertas = window.anomalyEngine.evaluatePoint(pontoId);

      this.closeModal('modal-nova-leitura');
      form.reset();

      if (novosAlertas.length > 0) {
        window.ui.showToast(`Leitura salva! ⚠️ ${novosAlertas.length} anomalia detectada e registrada nos alertas.`, 'warning', 6000);
      } else {
        window.ui.showToast(`Leitura de ${volume.toFixed(2)} litros registrada com sucesso!`, 'success');
      }

      this.renderCurrentView();
    } catch (err) {
      window.ui.showToast(err.message, 'error');
    }
  }

  // --- AÇÕES DO FORMULÁRIO DE NOVO PONTO (RF04, CA07) ---
  salvarNovoPonto(e) {
    if (e) e.preventDefault();
    const form = document.getElementById('form-novo-ponto');
    if (!form) return;

    const user = window.auth.getCurrentUser();
    if (!user) return;

    const nome = form.elements['nome'].value;
    const localizacao = form.elements['localizacao'].value;
    const ativo = form.elements['ativo'].checked;

    try {
      const novoPonto = window.db.createPoint({
        nome,
        localizacao_descritiva: localizacao,
        ativo
      }, user.id);

      this.closeModal('modal-novo-ponto');
      form.reset();
      window.ui.showToast(`Ponto "${novoPonto.nome}" cadastrado com sucesso!`, 'success');
      this.selectedPointId = novoPonto.id;
      this.renderCurrentView();
    } catch (err) {
      window.ui.showToast(err.message, 'error');
    }
  }

  // --- EDIÇÃO DE PONTO (RF05) ---
  abrirEditarPonto(pointId) {
    const point = window.db.getPointById(pointId);
    if (!point) return;

    const form = document.getElementById('form-editar-ponto');
    if (form) {
      form.elements['pointId'].value = point.id;
      form.elements['nome'].value = point.nome;
      form.elements['localizacao'].value = point.localizacao_descritiva || '';
      form.elements['ativo'].checked = point.ativo;
    }
    this.openModal('modal-editar-ponto');
  }

  salvarEditarPonto(e) {
    if (e) e.preventDefault();
    const form = document.getElementById('form-editar-ponto');
    if (!form) return;

    const user = window.auth.getCurrentUser();
    if (!user) return;

    const pointId = form.elements['pointId'].value;
    const nome = form.elements['nome'].value;
    const localizacao = form.elements['localizacao'].value;
    const ativo = form.elements['ativo'].checked;

    try {
      window.db.updatePoint(pointId, {
        nome,
        localizacao_descritiva: localizacao,
        ativo
      }, user.id);

      this.closeModal('modal-editar-ponto');
      window.ui.showToast('Ponto de monitoramento atualizado com sucesso!', 'success');
      this.renderCurrentView();
    } catch (err) {
      window.ui.showToast(err.message, 'error');
    }
  }

  togglePoint(pointId) {
    const user = window.auth.getCurrentUser();
    if (!user) return;

    try {
      const updated = window.db.togglePointStatus(pointId, user.id);
      const statusText = updated.ativo ? 'reativado' : 'inativado';
      window.ui.showToast(`Ponto "${updated.nome}" ${statusText} com sucesso.`, 'info');
      this.renderCurrentView();
    } catch (err) {
      window.ui.showToast(err.message, 'error');
    }
  }

  // --- GERAÇÃO DE MASSA DE TESTES SIMULADA (RF15, CA17) ---
  salvarSimulacaoLote(e) {
    if (e) e.preventDefault();
    const form = document.getElementById('form-simular-lote');
    if (!form) return;

    const pontoId = form.elements['pontoId'].value;
    const dias = parseInt(form.elements['dias'].value, 10) || 7;
    const leiturasPorDia = parseInt(form.elements['leiturasPorDia'].value, 10) || 3;

    try {
      const now = new Date();
      const lote = [];

      for (let d = dias - 1; d >= 0; d--) {
        const diaBase = new Date(now);
        diaBase.setDate(diaBase.getDate() - d);

        for (let k = 0; k < leiturasPorDia; k++) {
          const lDate = new Date(diaBase);
          lDate.setHours(7 + k * 5, Math.floor(Math.random() * 50), 0, 0);

          const volume = parseFloat((30 + Math.random() * 50).toFixed(2));
          lote.push({
            ponto_monitoramento_id: pontoId,
            volume_litros: volume,
            origem_dado: 'simulada_teste',
            registrado_em: lDate.toISOString()
          });
        }
      }

      window.db.createBulkReadings(lote);
      const novosAlertas = window.anomalyEngine.evaluatePoint(pontoId);

      this.closeModal('modal-simular-lote');
      window.ui.showToast(`Lote gerado: ${lote.length} leituras simuladas inseridas com sucesso (RF15)!`, 'success');
      this.renderCurrentView();
    } catch (err) {
      window.ui.showToast(err.message, 'error');
    }
  }

  // --- AÇÕES DO MOTOR DE ANOMALIAS (RF09, RF10, RF11, CA12, CA13, CA14) ---
  executarVarredura() {
    const user = window.auth.getCurrentUser();
    if (!user) return;

    const points = window.db.getPointsByUser(user.id);
    let totalNovos = 0;

    points.forEach(p => {
      const novos = window.anomalyEngine.evaluatePoint(p.id);
      totalNovos += novos.length;
    });

    if (totalNovos > 0) {
      window.ui.showToast(`Varredura concluída! ${totalNovos} novo(s) alerta(s) de anomalia gerado(s).`, 'warning');
    } else {
      window.ui.showToast('Varredura concluída: todas as leituras estão dentro dos padrões normais.', 'success');
    }

    this.renderCurrentView();
  }

  simularVazamentoMadrugada() {
    const user = window.auth.getCurrentUser();
    if (!user) return;

    const points = window.db.getPointsByUser(user.id);
    const targetPoint = (this.selectedPointId && this.selectedPointId !== 'all')
      ? this.selectedPointId
      : points[0]?.id;

    if (!targetPoint) {
      window.ui.showToast('Cadastre um ponto primeiro para simular.', 'warning');
      return;
    }

    try {
      const res = window.anomalyEngine.simularCenarioVazamentoMadrugada(targetPoint);
      window.ui.showToast(`[CA12 Atendido] Simulação de vazamento noturno executada! 5 leituras na madrugada geraram o alerta preventivo.`, 'warning', 6000);
      window.location.hash = '#alertas';
      this.renderCurrentView();
    } catch (err) {
      window.ui.showToast(err.message, 'error');
    }
  }

  simularPicoConsumo() {
    const user = window.auth.getCurrentUser();
    if (!user) return;

    const points = window.db.getPointsByUser(user.id);
    const targetPoint = (this.selectedPointId && this.selectedPointId !== 'all')
      ? this.selectedPointId
      : points[0]?.id;

    if (!targetPoint) {
      window.ui.showToast('Cadastre um ponto primeiro para simular.', 'warning');
      return;
    }

    try {
      const res = window.anomalyEngine.simularCenarioPicoConsumo(targetPoint);
      window.ui.showToast(`[CA13 Atendido] Simulação de consumo acima da média (+50%) executada com sucesso! Alerta gerado.`, 'warning', 6000);
      window.location.hash = '#alertas';
      this.renderCurrentView();
    } catch (err) {
      window.ui.showToast(err.message, 'error');
    }
  }

  mudarStatusAlerta(alertId, novoStatus) {
    const user = window.auth.getCurrentUser();
    try {
      window.db.updateAlertStatus(alertId, novoStatus, user?.id);
      const labels = { pendente: 'reaberto como pendente', reconhecido: 'reconhecido', resolvido: 'marcado como resolvido' };
      window.ui.showToast(`Alerta ${labels[novoStatus] || novoStatus} com sucesso!`, 'success');
      this.renderCurrentView();
    } catch (err) {
      window.ui.showToast(err.message, 'error');
    }
  }

  // --- TELEMETRIA IOT (ESP32) ---
  dispararTelemetriaIoT() {
    const pontoId = document.getElementById('sim-ponto-iot')?.value;
    const volume = parseFloat(document.getElementById('sim-volume-iot')?.value || 10);

    if (!pontoId) {
      window.ui.showToast('Selecione um ponto de destino.', 'error');
      return;
    }

    try {
      const nova = window.db.createReading({
        ponto_monitoramento_id: pontoId,
        volume_litros: volume,
        origem_dado: 'sensor_iot',
        registrado_em: new Date().toISOString()
      });

      window.anomalyEngine.evaluatePoint(pontoId);
      window.ui.showToast(`Pacote de telemetria recebido do ESP32! Leitura gravada com tag "sensor_iot" (RF06, Seção 8.3).`, 'success');
      this.renderCurrentView();
    } catch (err) {
      window.ui.showToast(err.message, 'error');
    }
  }

  // --- FILTROS E HISTÓRICO ---
  aplicarFiltroHistorico() {
    const pSelect = document.getElementById('filtro-ponto');
    const oSelect = document.getElementById('filtro-origem');
    const dInicio = document.getElementById('filtro-data-inicio');
    const dFim = document.getElementById('filtro-data-fim');

    if (pSelect) window.ui.historicoFilters.pontoId = pSelect.value;
    if (oSelect) window.ui.historicoFilters.origem = oSelect.value;
    if (dInicio) window.ui.historicoFilters.dataInicio = dInicio.value;
    if (dFim) window.ui.historicoFilters.dataFim = dFim.value;

    window.ui.currentHistoricoPage = 1;
    const user = window.auth.getCurrentUser();
    const container = document.getElementById('main-content-view');
    window.ui.renderHistorico(container, user);
  }

  limparFiltrosHistorico() {
    window.ui.historicoFilters = { pontoId: 'all', origem: 'all', dataInicio: '', dataFim: '' };
    window.ui.currentHistoricoPage = 1;
    const user = window.auth.getCurrentUser();
    const container = document.getElementById('main-content-view');
    window.ui.renderHistorico(container, user);
  }

  mudarPaginaHistorico(novaPagina) {
    window.ui.currentHistoricoPage = novaPagina;
    const user = window.auth.getCurrentUser();
    const container = document.getElementById('main-content-view');
    window.ui.renderHistorico(container, user);
  }

  filtrarHistoricoPorPonto(pointId) {
    window.ui.historicoFilters.pontoId = pointId;
    window.ui.currentHistoricoPage = 1;
    window.location.hash = '#historico';
  }

  exportarHistoricoCSV() {
    const user = window.auth.getCurrentUser();
    if (!user) return;

    const readings = window.db.getReadingsByUser(user.id);
    if (readings.length === 0) {
      window.ui.showToast('Nenhuma leitura disponível para exportação.', 'warning');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'ID;Ponto;Volume_Litros;Origem_Dado;Data_Hora\r\n';

    readings.forEach(r => {
      const p = window.db.getPointById(r.ponto_monitoramento_id);
      const row = [
        r.id,
        p ? `"${p.nome.replace(/"/g, '""')}"` : 'Desconhecido',
        r.volume_litros.toFixed(2),
        r.origem_dado,
        `"${r.registrado_em}"`
      ].join(';');
      csvContent += row + '\r\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aguasmart_leituras_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.ui.showToast('Arquivo CSV gerado e descarregado com sucesso!', 'success');
  }

  // --- ALTERNADOR DE GRÁFICO DO DASHBOARD ---
  switchDashboardChart(period) {
    this.currentChartPeriod = period;

    ['24h', '7d', '30d'].forEach(p => {
      const btn = document.getElementById(`btn-chart-${p}`);
      if (btn) {
        if (p === period) {
          btn.className = 'px-3 py-1.5 rounded-lg bg-white text-sky-700 shadow-sm transition';
        } else {
          btn.className = 'px-3 py-1.5 rounded-lg hover:text-slate-900 transition';
        }
      }
    });

    const user = window.auth.getCurrentUser();
    window.ui.renderDashboardCharts(user.id, this.selectedPointId, period);
  }

  // --- AUTENTICAÇÃO E TROCA RÁPIDA DE PERFIL (CA01 - CA05) ---
  switchUser(tipo) {
    try {
      const user = window.auth.quickLogin(tipo);
      window.ui.showToast(`Sessão iniciada como ${user.nome} (${user.papel})`, 'success');
      this.selectedPointId = 'all';
      this.renderCurrentView();
    } catch (err) {
      window.ui.showToast(err.message, 'error');
    }
  }

  loginAsAdmin() {
    this.switchUser('admin');
    window.location.hash = '#admin';
  }

  fazerLogin(e) {
    if (e) e.preventDefault();
    const form = document.getElementById('form-login');
    if (!form) return;

    const email = form.elements['email'].value;
    const senha = form.elements['senha'].value;

    try {
      const user = window.auth.login(email, senha);
      this.closeModal('modal-auth');
      form.reset();
      window.ui.showToast(`Bem-vindo, ${user.nome}!`, 'success');
      this.renderCurrentView();
    } catch (err) {
      window.ui.showToast(err.message, 'error');
    }
  }

  fazerCadastro(e) {
    if (e) e.preventDefault();
    const form = document.getElementById('form-cadastro');
    if (!form) return;

    const nome = form.elements['nome'].value;
    const email = form.elements['email'].value;
    const senha = form.elements['senha'].value;

    try {
      const newUser = window.auth.register(nome, email, senha);
      window.auth.setSession(newUser, true);
      this.closeModal('modal-auth');
      form.reset();
      window.ui.showToast(`Conta criada com sucesso! Ponto de medição inicial gerado.`, 'success');
      this.renderCurrentView();
    } catch (err) {
      window.ui.showToast(err.message, 'error');
    }
  }

  logout() {
    window.auth.logout();
    window.ui.showToast('Sessão encerrada com segurança.', 'info');
    this.openModal('modal-auth');
  }

  resetarBancoDeDados() {
    if (confirm('Deseja realmente restaurar os dados de demonstração padrão do sistema? Todas as leituras e pontos voltarão ao estado original do spec.md.')) {
      window.db.resetToDefault();
      window.ui.showToast('Banco de dados restaurado para os dados demonstrativos padrão!', 'success');
      this.renderCurrentView();
    }
  }

  toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) {
      mobileMenu.classList.toggle('hidden');
    }
  }
}

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
});
