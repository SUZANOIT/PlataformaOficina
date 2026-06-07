import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Maximize2, 
  Minimize2, 
  Printer, 
  Clock, 
  Sparkles, 
  Calculator, 
  TrendingUp, 
  Wrench, 
  Truck, 
  ShieldCheck, 
  Layers, 
  ArrowRight,
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  Cpu, 
  Database, 
  Code2, 
  Award, 
  Mail, 
  Globe,
  Home,
  Check,
  BarChart3,
  Building2,
  Layers3
} from 'lucide-react';

// Interfaces for Slide Configuration
interface Slide {
  id: number;
  title: string;
  subtitle?: string;
}

export function Presentation() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplayDelay, setAutoplayDelay] = useState(5000); // 5s default
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'gold' | 'light'>('dark');
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);

  // AI Simulator States
  const [aiType, setAiType] = useState<'nfe' | 'fault' | 'suggest'>('nfe');
  const [aiInput, setAiInput] = useState('');
  const [aiOutput, setAiOutput] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // ROI Calculator States
  const [fleetSize, setFleetSize] = useState(20);
  const [workOrders, setWorkOrders] = useState(80);

  const containerRef = useRef<HTMLDivElement>(null);
  const autoplayTimer = useRef<any>(null);

  // List of slides
  const slides: Slide[] = [
    { id: 1, title: "SUZANO IT", subtitle: "Tecnologia Inteligente para Gestão de Oficinas e Frotas" },
    { id: 2, title: "QUEM SOMOS", subtitle: "Transformando o setor automotivo com tecnologia de ponta" },
    { id: 3, title: "PROBLEMAS DO MERCADO", subtitle: "Os gargalos operacionais e financeiros do setor" },
    { id: 4, title: "NOSSA SOLUÇÃO", subtitle: "Uma plataforma centralizada, inteligente e integrada" },
    { id: 5, title: "MÓDULO GESTÃO DE OFICINA", subtitle: "Controle absoluto, do orçamento à emissão de nota fiscal" },
    { id: 6, title: "MÓDULO GESTÃO DE FROTAS", subtitle: "Controle de ativos, redução de custos e previsibilidade" },
    { id: 7, title: "INTELIGÊNCIA ARTIFICIAL", subtitle: "Automatizando e otimizando com modelos cognitivos" },
    { id: 8, title: "DIFERENCIAIS DA PLATAFORMA", subtitle: "Por que a Suzano IT é a melhor escolha?" },
    { id: 9, title: "MODELO DE NEGÓCIO", subtitle: "Planos SaaS escaláveis para todos os tamanhos" },
    { id: 10, title: "MERCADO ALVO", subtitle: "Amplo potencial de atendimento no Brasil" },
    { id: 11, title: "ARQUITETURA TECNOLÓGICA", subtitle: "Segurança, escalabilidade e performance" },
    { id: 12, title: "ROADMAP DE DESENVOLVIMENTO", subtitle: "Nossa jornada de evolução contínua" },
    { id: 13, title: "BENEFÍCIOS PARA O CLIENTE", subtitle: "Resumo do valor entregue aos nossos parceiros" },
    { id: 14, title: "ENCERRAMENTO", subtitle: "Mais controle. Mais produtividade. Mais resultado." },
  ];

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          exitFullscreen();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, isFullscreen]);

  // Autoplay Logic
  useEffect(() => {
    if (isPlaying) {
      autoplayTimer.current = setTimeout(() => {
        nextSlide();
      }, autoplayDelay);
    } else if (autoplayTimer.current) {
      clearTimeout(autoplayTimer.current);
    }

    return () => {
      if (autoplayTimer.current) clearTimeout(autoplayTimer.current);
    };
  }, [isPlaying, currentSlide, autoplayDelay]);

  // Handle Fullscreen Toggling
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      exitFullscreen();
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Slide navigation
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  // AI Prompt Simulator Actions
  const runAiSimulation = () => {
    if (isAiGenerating) return;
    setIsAiGenerating(true);
    setAiOutput('');

    let text = '';
    if (aiType === 'nfe') {
      text = `Descrição Fiscal Gerada por Suzano-AI:
"Prestação de serviços mecânicos especializados englobando o diagnóstico computadorizado do sistema de injeção, substituição preventiva do filtro de ar do motor e velas de ignição originais, além de alinhamento técnico tridimensional de direção e balanceamento de rodas traseiras e dianteiras para melhoria da estabilidade e redução de desgaste dos pneus."`;
    } else if (aiType === 'fault') {
      text = `Análise Preditiva Suzano-AI:
• Veículo Analisado: Placa JXG-8941 (Corolla 2019)
• Padrão Detectado: Ruído relatado aos 80.000km com histórico de desgaste irregular no jogo de pastilhas dianteiras.
• Diagnóstico Recomendado: Verificar empenamento dos discos de freio (89% de probabilidade) e calibragem de pinças de freio.
• Ação Preventiva: Programar substituição de pastilhas em até 1.500km para evitar desgaste do disco.`;
    } else {
      text = `Sugestão de Peças e Mão de Obra para OS:
• Com base no veículo Chevrolet Onix 2021 (Revisão 40.000km):
1. Óleo Lubrificante 5W30 Sintético Dexos (4 Litros)
2. Filtro de Óleo do Motor (1 Unidade)
3. Filtro de Combustível (1 Unidade)
4. Anel de Vedação do Cárter (1 Unidade)
5. Mão de Obra: Substituição de fluídos e filtros + Inspeção de 30 itens de segurança (Freios, Suspensão e Iluminação).
• Tempo Estimado de Execução: 1.5 horas.`;
    }

    let index = 0;
    const interval = setInterval(() => {
      setAiOutput((prev) => prev + text.charAt(index));
      index++;
      if (index >= text.length) {
        clearInterval(interval);
        setIsAiGenerating(false);
      }
    }, 15);
  };

  // Preset inputs for AI Simulator
  useEffect(() => {
    if (aiType === 'nfe') {
      setAiInput("troca oleo velas filtro ar alinhamento balanceamento Corolla");
    } else if (aiType === 'fault') {
      setAiInput("Corolla 2019 trepidação e barulho metalico ao frear em descidas");
    } else {
      setAiInput("Onix 2021 com 40.000 km revisão periodica recomendação");
    }
    setAiOutput('');
  }, [aiType]);

  // Calculations for ROI Widget
  const hoursSaved = Math.round((workOrders * 1.8) + (fleetSize * 0.7));
  const estimatedSavings = Math.round((workOrders * 35) + (fleetSize * 95));
  
  const getRecommendedPlan = () => {
    if (workOrders <= 40 && fleetSize <= 8) {
      return { name: "STARTER", price: "R$ 199/mês", desc: "Perfeito para pequenas oficinas independentes" };
    } else if (workOrders <= 250 && fleetSize <= 80) {
      return { name: "PROFESSIONAL", price: "R$ 499/mês", desc: "Recomendado para auto centers e frotas em crescimento" };
    } else {
      return { name: "ENTERPRISE", price: "Sob Consulta", desc: "Para grandes concessionárias, transportadoras e órgãos públicos" };
    }
  };

  const recommendedPlan = getRecommendedPlan();

  // Print function
  const triggerPrint = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 500);
  };

  // Swipe Gestures Support
  let touchStartX = 0;
  let touchEndX = 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX - touchEndX > 50) {
      nextSlide(); // Swipe left -> Next
    }
    if (touchEndX - touchStartX > 50) {
      prevSlide(); // Swipe right -> Prev
    }
  };

  // Theme helper classes
  const getThemeClasses = () => {
    switch (theme) {
      case 'gold':
        return {
          bg: "bg-[#0c0c0e] text-[#f4edd2]",
          card: "bg-[#141416]/90 border-[#c4a45a]/30 text-[#f4edd2]",
          primaryText: "text-[#c4a45a]",
          accentText: "text-[#e8d59b]",
          badge: "bg-[#c4a45a]/10 border-[#c4a45a]/30 text-[#c4a45a]",
          button: "bg-[#c4a45a] hover:bg-[#b09048] text-black",
          buttonSecondary: "bg-[#1d1d22] hover:bg-[#27272e] border-[#c4a45a]/30 text-[#f4edd2]",
          progressBg: "bg-neutral-800",
          progressFill: "bg-[#c4a45a]",
          accentGlow: "shadow-[#c4a45a]/10"
        };
      case 'light':
        return {
          bg: "bg-[#f8fafc] text-[#0f172a]",
          card: "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm",
          primaryText: "text-[#0284c7]",
          accentText: "text-[#0f766e]",
          badge: "bg-[#f0f9ff] border-[#bae6fd] text-[#0369a1]",
          button: "bg-[#0284c7] hover:bg-[#0369a1] text-white",
          buttonSecondary: "bg-[#f1f5f9] hover:bg-[#e2e8f0] border-[#cbd5e1] text-[#334155]",
          progressBg: "bg-slate-200",
          progressFill: "bg-[#0284c7]",
          accentGlow: "shadow-sky-500/5"
        };
      case 'dark':
      default:
        return {
          bg: "bg-[#080b11] text-[#f8fafc]",
          card: "bg-[#101725]/80 border-[#1e293b] text-[#f8fafc]",
          primaryText: "text-[#6366f1]",
          accentText: "text-[#38bdf8]",
          badge: "bg-[#6366f1]/10 border-[#4f46e5]/30 text-[#818cf8]",
          button: "bg-[#6366f1] hover:bg-[#4f46e5] text-white",
          buttonSecondary: "bg-[#141d2e] hover:bg-[#1e293b] border-[#334155] text-[#e2e8f0]",
          progressBg: "bg-slate-800",
          progressFill: "bg-[#6366f1]",
          accentGlow: "shadow-indigo-500/10"
        };
    }
  };

  const style = getThemeClasses();

  if (isPrintMode) {
    return (
      <div className="bg-white text-slate-900 p-0 m-0 w-full">
        {/* Printable view styles */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body { background: white; color: black; }
            .print-page {
              page-break-after: always;
              width: 100vw;
              height: 100vh;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding: 40px;
              box-sizing: border-box;
              background: #fafafa;
              border-bottom: 2px solid #ddd;
            }
          }
        `}} />
        
        {slides.map((slide, idx) => (
          <div key={slide.id} className="print-page flex flex-col justify-between min-h-screen p-12 border-b border-slate-200">
            <div className="flex justify-between items-center border-b pb-4 border-slate-200">
              <span className="font-bold text-lg text-slate-800 tracking-wider">SUZANO IT</span>
              <span className="text-sm text-slate-500">Slide {slide.id} de 14</span>
            </div>
            
            <div className="flex-1 flex flex-col justify-center items-center py-12">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">{slide.subtitle}</span>
              <h1 className="text-4xl font-extrabold text-slate-900 text-center mb-6">{slide.title}</h1>
              
              <div className="w-full max-w-3xl text-left text-slate-700 space-y-4">
                {idx === 0 && (
                  <div className="grid grid-cols-2 gap-8 items-center">
                    <ul className="list-disc pl-5 space-y-2 text-lg">
                      <li>Plataforma SaaS Multiempresa (Multi-Tenant)</li>
                      <li>Inteligência Artificial aplicada ao setor automotivo</li>
                      <li>Gestão completa de oficinas e frotas</li>
                      <li>Automação de processos operacionais e fiscais</li>
                      <li>Controle financeiro avançado e fluxo de caixa</li>
                    </ul>
                    <div className="p-6 bg-slate-100 rounded-lg border border-slate-300">
                      <p className="font-semibold text-slate-800 mb-2">Público Alvo:</p>
                      <p className="text-sm text-slate-600">Investidores, Clientes Corporativos, Órgãos Públicos e Gestores de Frotas.</p>
                    </div>
                  </div>
                )}
                {idx === 1 && (
                  <div className="space-y-4">
                    <p className="text-xl text-center leading-relaxed">
                      A Suzano IT é uma empresa especializada no desenvolvimento de soluções tecnológicas inovadoras para o setor automotivo. Transformamos a gestão de oficinas e frotas através da digitalização de processos e inteligência operacional.
                    </p>
                    <div className="grid grid-cols-3 gap-4 pt-4">
                      {["Plataforma 100% em Nuvem", "Arquitetura SaaS Escalável", "Inteligência Artificial Integrada", "Multiempresa (Multi-Tenant)", "APIs para Integrações", "Segurança e LGPD"].map((d, i) => (
                        <div key={i} className="p-4 bg-slate-100 rounded text-center font-semibold text-sm border border-slate-200">{d}</div>
                      ))}
                    </div>
                  </div>
                )}
                {idx === 2 && (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-bold text-lg text-red-600 mb-3">Principais Desafios do Setor:</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Controle manual de serviços e falta de histórico</li>
                        <li>Falta de rastreabilidade e orçamentos descentralizados</li>
                        <li>Processos operacionais lentos e retrabalho</li>
                        <li>Dificuldade no controle financeiro e inadimplência</li>
                        <li>Ausência de indicadores e dashboards executivos</li>
                        <li>Alto custo operacional e desperdício de ativos</li>
                      </ul>
                    </div>
                    <div className="bg-red-50 p-6 rounded-lg border border-red-200 flex flex-col justify-center">
                      <h4 className="font-bold text-red-800 mb-2">Impacto nos Negócios:</h4>
                      <p className="text-red-700 font-medium text-lg">Perdas financeiras recorrentes, baixa produtividade, falhas operacionais críticas e falta de controle gerencial estratégico.</p>
                    </div>
                  </div>
                )}
                {idx === 3 && (
                  <div className="space-y-6">
                    <p className="text-lg text-center font-medium">A Plataforma Suzano IT centraliza toda a operação em um único ambiente moderno e integrado.</p>
                    <div className="grid grid-cols-4 gap-3 text-center">
                      {["Gestão de Oficinas", "Gestão de Frotas", "Controle Financeiro", "Gestão de Veículos", "Ordens de Serviço", "Emissão de NF-e", "Dashboard Executivo", "Inteligência Artificial"].map((item, i) => (
                        <div key={i} className="p-3 bg-blue-50 text-blue-900 border border-blue-200 rounded font-semibold text-sm">{item}</div>
                      ))}
                    </div>
                  </div>
                )}
                {idx === 4 && (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 mb-2">Recursos do Módulo Oficina:</h3>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li>Cadastro completo de Clientes e Veículos</li>
                        <li>Ordens de Serviço dinâmicas e Orçamentos com tabelas</li>
                        <li>Controle de estoque de peças e serviços (Mão de obra)</li>
                        <li>Histórico unificado de manutenções por placa</li>
                        <li>Integração financeira direta (Fluxo de caixa, Contas a pagar/receber)</li>
                        <li>Emissão automática de NF-e de Serviços</li>
                      </ul>
                    </div>
                    <div className="bg-slate-100 p-6 rounded-lg border border-slate-300 flex flex-col justify-center">
                      <h4 className="font-bold text-slate-800 mb-2">Resultados Obtidos:</h4>
                      <p className="text-slate-700 text-lg">Mais organização da oficina, aumento imediato do faturamento e redução de retrabalho na oficina.</p>
                    </div>
                  </div>
                )}
                {idx === 5 && (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 mb-2">Recursos do Módulo Frota:</h3>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li>Cadastro de Veículos e Subfrotas organizacionais</li>
                        <li>Gestão ativa de Motoristas e atribuição de uso</li>
                        <li>Histórico detalhado de preventivas e corretivas</li>
                        <li>Controle rígido de abastecimento e média de consumo</li>
                        <li>Controle de rodagem e custos de pneus</li>
                        <li>Alertas automáticos de preventivas (KM ou Data)</li>
                      </ul>
                    </div>
                    <div className="bg-slate-100 p-6 rounded-lg border border-slate-300 flex flex-col justify-center">
                      <h4 className="font-bold text-slate-800 mb-2">Resultados na Frota:</h4>
                      <p className="text-slate-700 text-lg">Redução direta do custo por km rodado, maior disponibilidade física dos veículos e controle total dos ativos da empresa.</p>
                    </div>
                  </div>
                )}
                {idx === 6 && (
                  <div className="space-y-4">
                    <p className="text-lg text-center font-medium">A Suzano IT utiliza algoritmos de Inteligência Artificial para automatizar tarefas operacionais de rotina.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-100 rounded border border-slate-300">
                        <h4 className="font-bold text-slate-800">Recursos de IA:</h4>
                        <ul className="list-disc pl-5 text-sm space-y-1 mt-2">
                          <li>Geração automática de descrição tributária para NF-e</li>
                          <li>Sugestão inteligente de serviços complementares</li>
                          <li>Identificação preditiva de padrões de falhas mecânicas</li>
                          <li>Dashboards preditivos e relatórios gerenciais automáticos</li>
                        </ul>
                      </div>
                      <div className="p-4 bg-blue-50 rounded border border-blue-200">
                        <h4 className="font-bold text-blue-900">Benefícios:</h4>
                        <p className="text-sm text-blue-800 mt-2">Eliminação do trabalho manual repetitivo, aumento drástico de produtividade da recepção de veículos e alta qualidade na estruturação de dados.</p>
                      </div>
                    </div>
                  </div>
                )}
                {idx === 7 && (
                  <div className="grid grid-cols-2 gap-6">
                    <ul className="list-disc pl-5 space-y-2 text-md">
                      <li>Plataforma SaaS nativa em nuvem</li>
                      <li>Operação multiempresa isolada (Multi-Tenant)</li>
                      <li>APIs REST abertas para integração com ERPs externos</li>
                      <li>Integração automatizada com Tabelas FIPE e ReceitaWS</li>
                    </ul>
                    <ul className="list-disc pl-5 space-y-2 text-md">
                      <li>Emissão de Nota Fiscal integrada</li>
                      <li>Motor de Inteligência Artificial nativo</li>
                      <li>Segurança de nível corporativo e conformidade com LGPD</li>
                      <li>Hospedagem elástica AWS e atualizações invisíveis</li>
                    </ul>
                  </div>
                )}
                {idx === 8 && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-5 bg-slate-100 rounded border border-slate-200">
                      <h4 className="font-bold text-slate-900 border-b pb-2 mb-2">STARTER</h4>
                      <p className="text-xs text-slate-600 mb-4">Pequenas oficinas e centros independentes.</p>
                      <span className="font-bold text-lg">R$ 199/mês</span>
                    </div>
                    <div className="p-5 bg-blue-50 rounded border border-blue-300">
                      <h4 className="font-bold text-blue-900 border-b pb-2 mb-2">PROFESSIONAL</h4>
                      <p className="text-xs text-blue-700 mb-4">Empresas em crescimento com gestão completa.</p>
                      <span className="font-bold text-lg text-blue-900">R$ 499/mês</span>
                    </div>
                    <div className="p-5 bg-slate-900 text-white rounded border border-slate-800">
                      <h4 className="font-bold border-b pb-2 mb-2">ENTERPRISE</h4>
                      <p className="text-xs text-slate-400 mb-4">Grandes operações, frotistas e órgãos públicos.</p>
                      <span className="font-bold text-lg text-amber-400">Sob Consulta</span>
                    </div>
                  </div>
                )}
                {idx === 9 && (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-bold text-slate-900 mb-2">Segmentos Atendidos:</h3>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li>Oficinas Mecânicas e Auto Centers</li>
                        <li>Concessionárias e Centros Automotivos autorizados</li>
                        <li>Transportadoras de carga e logística de distribuição</li>
                        <li>Locadoras de veículos e cooperativas de táxi/aplicativo</li>
                        <li>Prefeituras municipais e Órgãos públicos</li>
                      </ul>
                    </div>
                    <div className="p-6 bg-green-50 rounded border border-green-200 flex flex-col justify-center">
                      <h4 className="font-bold text-green-900 mb-2">Potencial de Crescimento:</h4>
                      <p className="text-sm text-green-800">O mercado de pós-venda automotivo no Brasil movimenta bilhões anualmente. A Suzano IT oferece digitalização simples e escalável com modelo de recorrência mensal (MRR).</p>
                    </div>
                  </div>
                )}
                {idx === 10 && (
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-slate-100 rounded border">
                      <h4 className="font-bold text-slate-800 mb-1">Frontend</h4>
                      <p className="text-xs text-slate-600">React + TypeScript, Tailwind CSS, Componentes Modulares</p>
                    </div>
                    <div className="p-4 bg-slate-100 rounded border">
                      <h4 className="font-bold text-slate-800 mb-1">Backend</h4>
                      <p className="text-xs text-slate-600">Kotlin, Spring Boot, Java Virtual Machine (JVM)</p>
                    </div>
                    <div className="p-4 bg-slate-100 rounded border">
                      <h4 className="font-bold text-slate-800 mb-1">Banco de Dados</h4>
                      <p className="text-xs text-slate-600">PostgreSQL Relacional com Pool Conexões</p>
                    </div>
                    <div className="p-4 bg-slate-100 rounded border">
                      <h4 className="font-bold text-slate-800 mb-1">Segurança</h4>
                      <p className="text-xs text-slate-600">Autenticação JWT, Criptografia, Compliance LGPD</p>
                    </div>
                  </div>
                )}
                {idx === 11 && (
                  <div className="grid grid-cols-7 gap-2 text-center text-xs">
                    {[
                      { f: "Fase 1", n: "Gestão de Oficina", s: "✓ Concluído" },
                      { f: "Fase 2", n: "Gestão de Frota", s: "✓ Concluído" },
                      { f: "Fase 3", n: "Integração NF-e", s: "✓ Concluído" },
                      { f: "Fase 4", n: "Inteligência Artificial", s: "✓ Concluído" },
                      { f: "Fase 5", n: "Aplicativo Mobile", s: "Planejado" },
                      { f: "Fase 6", n: "Marketplace de Peças", s: "Planejado" },
                      { f: "Fase 7", n: "BI Avançado", s: "Planejado" },
                    ].map((item, i) => (
                      <div key={i} className={`p-2 border rounded ${i < 4 ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="font-bold block text-slate-500">{item.f}</span>
                        <p className="font-semibold text-slate-800 my-1">{item.n}</p>
                        <span className={`text-[10px] ${i < 4 ? 'text-blue-700 font-bold' : 'text-slate-500'}`}>{item.s}</span>
                      </div>
                    ))}
                  </div>
                )}
                {idx === 12 && (
                  <div className="grid grid-cols-2 gap-6">
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li><strong>Redução de custos operacionais:</strong> Economia no controle de frotas e manutenções preventivas.</li>
                      <li><strong>Controle financeiro rígido:</strong> Contas integradas e redução de inadimplência.</li>
                      <li><strong>Produtividade elevada:</strong> Menos burocracia e automação de processos.</li>
                      <li><strong>Segurança total:</strong> Armazenamento seguro e conformidade legal com LGPD.</li>
                    </ul>
                    <div className="p-6 bg-slate-100 rounded border border-slate-300 flex items-center justify-center">
                      <p className="text-center italic text-lg text-slate-700 font-semibold">"Transformando a Gestão de Oficinas e Frotas com Tecnologia e Inteligência Artificial."</p>
                    </div>
                  </div>
                )}
                {idx === 13 && (
                  <div className="text-center space-y-4">
                    <p className="text-xl">Website: <strong>www.suzanoit.com.br</strong></p>
                    <p className="text-xl">E-mail: <strong>contato@suzanoit.com.br</strong></p>
                    <p className="text-md text-slate-500 mt-6">"Mais controle. Mais produtividade. Mais resultado."</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center border-t pt-4 border-slate-200 text-xs text-slate-500">
              <span>Apresentação Comercial Suzano IT</span>
              <span>© {new Date().getFullYear()} Suzano IT. Todos os direitos reservados.</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen ${style.bg} flex flex-col justify-between transition-colors duration-500 overflow-hidden font-sans relative`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Decorative Background Glowing Dots for Premium Aesthetic (Dark modes only) */}
      {theme !== 'light' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className={`absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full blur-[120px] opacity-15 mix-blend-screen transition-colors duration-1000 ${theme === 'gold' ? 'bg-[#c4a45a]' : 'bg-indigo-600'}`} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full blur-[100px] opacity-10 mix-blend-screen bg-cyan-500" />
        </div>
      )}

      {/* TOP HEADER CONTROLS */}
      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-black/10">
        <div className="flex items-center gap-3">
          <Link to="/" className={`p-2 rounded-lg ${style.buttonSecondary} transition-colors flex items-center gap-1.5`} title="Voltar ao Painel">
            <Home size={16} />
            <span className="hidden sm:inline text-xs font-semibold">Painel</span>
          </Link>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-wider text-primary-gradient bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              SUZANO IT
            </span>
            <span className="text-[10px] text-muted-foreground/80 tracking-widest hidden md:inline">PLATAFORMA SAAS</span>
          </div>
        </div>

        {/* Presenter Toolbar Panel */}
        <div className="flex items-center gap-2">
          {/* Autoplay Controls */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-black/25 rounded-full border border-white/5">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-1.5 rounded-full transition-colors ${isPlaying ? 'text-amber-400' : 'text-slate-400 hover:text-white'}`}
              title={isPlaying ? "Pausar Autoplay" : "Iniciar Autoplay"}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <div className="text-[10px] font-mono text-slate-400">
              Autoplay:
            </div>
            <select
              value={autoplayDelay}
              onChange={(e) => setAutoplayDelay(Number(e.target.value))}
              className="bg-transparent text-[10px] text-slate-200 outline-none border-none cursor-pointer"
            >
              <option value={3000} className="bg-slate-900 text-white">3s</option>
              <option value={5000} className="bg-slate-900 text-white">5s</option>
              <option value={8000} className="bg-slate-900 text-white">8s</option>
              <option value={12000} className="bg-slate-900 text-white">12s</option>
            </select>
          </div>

          {/* Theme Toggles */}
          <div className="flex items-center bg-black/20 p-0.5 rounded-lg border border-white/5">
            <button 
              onClick={() => setTheme('dark')} 
              className={`px-2 py-1 rounded text-xs transition-all ${theme === 'dark' ? 'bg-[#6366f1]/20 text-white border border-[#6366f1]/40 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Slate
            </button>
            <button 
              onClick={() => setTheme('gold')} 
              className={`px-2 py-1 rounded text-xs transition-all ${theme === 'gold' ? 'bg-[#c4a45a]/20 text-[#f4edd2] border border-[#c4a45a]/40 font-bold' : 'text-slate-400 hover:text-[#f4edd2]'}`}
            >
              Gold
            </button>
            <button 
              onClick={() => setTheme('light')} 
              className={`px-2 py-1 rounded text-xs transition-all ${theme === 'light' ? 'bg-sky-100 text-sky-800 border border-sky-300 font-bold' : 'text-slate-400 hover:text-slate-800'}`}
            >
              Light
            </button>
          </div>

          {/* Screen Tools */}
          <button 
            onClick={triggerPrint} 
            className={`p-2 rounded-lg ${style.buttonSecondary} transition-colors`}
            title="Exportar Apresentação em PDF / Imprimir"
          >
            <Printer size={16} />
          </button>
          <button 
            onClick={toggleFullscreen} 
            className={`p-2 rounded-lg ${style.buttonSecondary} transition-colors`}
            title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT VIEW (SLIDE WRAPPER) */}
      <main className="relative flex-1 flex items-center justify-center p-4 md:p-8 z-10">
        
        {/* Previous Slide Indicator Left */}
        <button 
          onClick={prevSlide}
          className="absolute left-2 md:left-6 p-3 rounded-full bg-black/20 hover:bg-black/40 border border-white/5 text-slate-400 hover:text-white transition-all transform hover:scale-105 z-20"
          aria-label="Slide Anterior"
        >
          <ChevronLeft size={24} />
        </button>

        {/* The Slide Canvas */}
        <div className={`w-full max-w-6xl h-full min-h-[500px] md:h-[600px] rounded-2xl p-6 md:p-12 flex flex-col justify-between ${style.card} backdrop-blur-xl transition-all duration-500 shadow-2xl relative overflow-hidden`}>
          
          {/* Slide Progress Line Indicator */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-slate-800">
            <div 
              className={`h-full ${style.progressFill} transition-all duration-300`}
              style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
            />
          </div>

          {/* Slide Indicator Badge */}
          <div className="flex justify-between items-center mb-6">
            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${style.badge} tracking-widest uppercase`}>
              {slides[currentSlide].subtitle}
            </span>
            <span className="text-xs font-mono text-muted-foreground/60 tracking-wider">
              {String(currentSlide + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
            </span>
          </div>

          {/* SLIDE DYNAMIC COMPONENT INJECTION */}
          <div className="flex-1 flex flex-col justify-center overflow-y-auto pr-1">
            
            {/* SLIDE 1 - CAPA */}
            {currentSlide === 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
                <div className="lg:col-span-7 space-y-6 text-left">
                  <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none">
                    SUZANO <span className={style.primaryText}>IT</span>
                  </h1>
                  <p className="text-xl md:text-2xl text-muted-foreground font-light leading-relaxed">
                    Tecnologia Inteligente para Gestão de Oficinas e Frotas
                  </p>
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    {[
                      "Plataforma SaaS Multiempresa (Multi-Tenant) integrada",
                      "Inteligência Artificial aplicada ao diagnóstico e operação",
                      "Gestão completa do ciclo de manutenção de oficinas e frotas",
                      "Automação de processos fiscais e controle financeiro avançado"
                    ].map((bullet, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className={`p-1 rounded-full ${style.badge}`}>
                          <Check size={12} className={style.primaryText} />
                        </div>
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Visual Premium Simulator */}
                <div className="lg:col-span-5 relative flex justify-center">
                  <div className={`w-full max-w-md p-6 rounded-xl border bg-black/45 ${style.accentGlow} border-white/5 backdrop-blur-md relative overflow-hidden space-y-4`}>
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">suzanoit_dashboard.exe</span>
                    </div>

                    <div className="space-y-4">
                      {/* Simulated Chart Metrics */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5 text-center">
                          <span className="text-[10px] text-muted-foreground block">Disponibilidade</span>
                          <span className={`text-xl font-bold ${style.accentText}`}>98.6%</span>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5 text-center">
                          <span className="text-[10px] text-muted-foreground block">Margem Média</span>
                          <span className="text-xl font-bold text-emerald-400">+22.4%</span>
                        </div>
                      </div>

                      {/* Mock Chart Area */}
                      <div className="h-32 bg-white/5 rounded-lg border border-white/5 relative p-3 flex flex-col justify-between">
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                          <span>Monitoramento de Custos</span>
                          <span className="text-emerald-400 flex items-center gap-0.5"><TrendingUp size={10} /> -15% Desperdício</span>
                        </div>
                        <div className="flex items-end gap-1.5 h-20 pt-2 w-full justify-between">
                          {[30, 45, 35, 60, 50, 75, 90, 85, 110, 95].map((height, i) => (
                            <div 
                              key={i} 
                              className={`w-full ${i === 8 ? 'bg-indigo-500' : 'bg-slate-700/60'} rounded-t-sm transition-all duration-1000`}
                              style={{ height: `${height * 0.7}%` }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Bottom Alert */}
                      <div className="flex items-center justify-between text-xs bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 rounded-lg">
                        <span className="flex items-center gap-1.5 text-indigo-300">
                          <Cpu size={12} className="animate-pulse" /> IA Operacional
                        </span>
                        <span className="font-bold text-[10px] text-slate-300">OTIMIZANDO AGORA</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 2 - QUEM SOMOS */}
            {currentSlide === 1 && (
              <div className="space-y-6 text-center max-w-4xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-black">QUEM SOMOS</h2>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                  Somos uma empresa especializada no desenvolvimento de soluções tecnológicas de ponta para o mercado de pós-venda automotivo e frotas corporativas. Nosso foco é acelerar a transformação digital através da automação inteligente e da análise preditiva de dados.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                  {[
                    { title: "Plataforma 100% Cloud", desc: "Hospedagem elástica que elimina necessidade de infraestrutura local.", icon: <Globe size={24} className="text-blue-400" /> },
                    { title: "Arquitetura SaaS", desc: "Isolamento lógico Multi-Tenant. Escalabilidade para múltiplos clientes.", icon: <Layers size={24} className="text-indigo-400" /> },
                    { title: "IA Integrada", desc: "Inteligência Artificial nativa para otimização de faturamento e corretivas.", icon: <Sparkles size={24} className="text-amber-400" /> },
                    { title: "APIs e Integrações", desc: "Integração imediata com ERPs, Receita Federal (ReceitaWS) e Tabela FIPE.", icon: <Cpu size={24} className="text-teal-400" /> },
                    { title: "Segurança & LGPD", desc: "Criptografia de ponta a ponta e controle estrito de acessos baseados em perfil.", icon: <ShieldCheck size={24} className="text-emerald-400" /> },
                    { title: "Multiempresa", desc: "Permite controle simultâneo de filiais e subfrotas no mesmo ecossistema.", icon: <Building2 size={24} className="text-violet-400" /> }
                  ].map((pillar, i) => (
                    <div key={i} className="p-5 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl text-left space-y-2 transition-all hover:-translate-y-1">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/5 rounded-lg">{pillar.icon}</div>
                        <h4 className="font-bold text-sm">{pillar.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{pillar.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SLIDE 3 - PROBLEMAS DO MERCADO */}
            {currentSlide === 2 && (
              <div className="space-y-6 text-left max-w-5xl mx-auto w-full">
                <h2 className="text-3xl md:text-5xl font-black text-center mb-4">DESAFIOS DO MERCADO</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-2">
                  <div className="space-y-4">
                    {[
                      { t: "Controle Operacional Manual", d: "Uso ineficiente de planilhas e papéis na oficina, resultando em retrabalho." },
                      { t: "Falta de Rastreabilidade", d: "Ausência de histórico consolidado de serviços e substituição de peças por veículo." },
                      { t: "Orçamentos Descentralizados", d: "Perda de tempo na cotação manual de peças e envio lento de propostas." },
                      { t: "Inexistência de Indicadores", d: "Dificuldade em visualizar lucros reais, ticket médio e gargalos da oficina." },
                      { t: "Desperdício em Gestão de Frotas", d: "Falta de controle de combustíveis, manutenções vencidas e desgaste de pneus." }
                    ].map((item, idx) => (
                      <div key={idx} className="flex gap-4 items-start p-3 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl transition-all">
                        <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={20} />
                        <div>
                          <h4 className="font-bold text-sm text-red-200">{item.t}</h4>
                          <p className="text-xs text-muted-foreground">{item.d}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-6 bg-slate-900/40 p-6 rounded-xl border border-white/5 flex flex-col justify-between h-full">
                    <div>
                      <span className="text-xs font-bold text-red-400 uppercase tracking-widest block mb-2">Impacto Financeiro Direto</span>
                      <h3 className="text-xl font-bold mb-4">O Preço da Ineficiência</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        A ausência de um sistema integrado causa desperdício de insumos, perda recorrente de receita operacional por falhas de cobrança, frotas paradas por falta de manutenção preventiva e perda de clientes por demora no atendimento.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5 text-center">
                      <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg">
                        <span className="text-[10px] text-muted-foreground block uppercase">Perda de Produtividade</span>
                        <span className="text-2xl font-black text-red-400">+35%</span>
                      </div>
                      <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg">
                        <span className="text-[10px] text-muted-foreground block uppercase">Vazamento Financeiro</span>
                        <span className="text-2xl font-black text-red-400">Até 15%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 4 - NOSSA SOLUÇÃO */}
            {currentSlide === 3 && (
              <div className="space-y-6 text-center max-w-5xl mx-auto w-full">
                <h2 className="text-3xl md:text-5xl font-black">NOSSA SOLUÇÃO</h2>
                <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
                  A Suzano IT centraliza e automatiza todos os processos administrativos, operacionais e fiscais de oficinas mecânicas e frotas corporativas em um único ecossistema inteligente baseado em nuvem.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
                  {[
                    { title: "Gestão de Oficinas", desc: "Ordens de serviço, orçamentos rápidos e agendamentos.", icon: <Wrench className="text-blue-400" /> },
                    { title: "Gestão de Frotas", desc: "Controle de pneus, motoristas e custos de combustível.", icon: <Truck className="text-indigo-400" /> },
                    { title: "Controle Financeiro", desc: "Contas a pagar/receber, conciliação e DRE automática.", icon: <DollarSign className="text-emerald-400" /> },
                    { title: "Inteligência Artificial", desc: "Previsão de manutenção e gerador fiscal automático.", icon: <Sparkles className="text-amber-400" /> },
                    { title: "Central de NF-e", desc: "Emissão fiscal integrada e envio automático por e-mail.", icon: <CheckCircle2 className="text-teal-400" /> },
                    { title: "Estoque Inteligente", desc: "Controle e rastreabilidade total de peças e insumos.", icon: <Layers className="text-rose-400" /> },
                    { title: "Dashboards em Tempo Real", desc: "Métricas gerenciais prontas para tomada de decisão.", icon: <BarChart3 className="text-purple-400" /> },
                    { title: "Segurança de Dados", desc: "Infraestrutura robusta compatível com LGPD.", icon: <ShieldCheck className="text-cyan-400" /> },
                  ].map((module, idx) => (
                    <div key={idx} className="p-4 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl transition-all flex flex-col items-center text-center space-y-2">
                      <div className="p-2.5 bg-white/5 rounded-lg">{module.icon}</div>
                      <h4 className="font-bold text-xs">{module.title}</h4>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{module.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SLIDE 5 - MÓDULO GESTÃO DE OFICINA */}
            {currentSlide === 4 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
                <div className="lg:col-span-7 space-y-4 text-left">
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${style.badge} tracking-wider`}>Foco em Alta Produtividade</span>
                  <h2 className="text-3xl md:text-5xl font-black">GESTÃO DE OFICINAS</h2>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    Digitalize o fluxo operacional completo do seu centro automotivo. O sistema foi desenhado para eliminar gargalos de digitação e garantir agilidade no atendimento de balcão.
                  </p>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0" />
                        <span>Ordens de Serviço Dinâmicas</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0" />
                        <span>Orçamentos rápidos por E-mail/WhatsApp</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0" />
                        <span>Controle de Estoque e Almoxarifado</span>
                      </li>
                    </ul>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0" />
                        <span>Fluxo de Caixa e Contas a Pagar</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0" />
                        <span>Histórico de Manutenção por Veículo</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0" />
                        <span>Faturamento integrado com NF-e</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Interactive Workflow Simulation */}
                <div className="lg:col-span-5">
                  <div className="bg-white/5 border border-white/5 rounded-xl p-5 space-y-4">
                    <span className="text-[10px] text-muted-foreground font-mono block">Ciclo de Atendimento Automatizado</span>
                    
                    <div className="relative pl-6 space-y-4 border-l border-indigo-500/25 ml-2 text-left">
                      {[
                        { title: "1. Recepção & Checklist", desc: "Abertura rápida da OS via Tablet com fotos e sintomas." },
                        { title: "2. Orçamento & Peças", desc: "Consulta automática de preços e margens operacionais." },
                        { title: "3. Aprovação Digital", desc: "Cliente recebe proposta e aprova online via link seguro." },
                        { title: "4. Execução & Fechamento", desc: "Mecânico atualiza status e sistema emite NF-e com 1 clique." }
                      ].map((step, idx) => (
                        <div key={idx} className="relative">
                          <div className="absolute -left-8 top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-indigo-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          </div>
                          <h5 className="text-xs font-bold">{step.title}</h5>
                          <p className="text-[10px] text-muted-foreground">{step.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 6 - MÓDULO GESTÃO DE FROTAS */}
            {currentSlide === 5 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
                <div className="lg:col-span-7 space-y-4 text-left">
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${style.badge} tracking-wider`}>Foco em Redução de Custos</span>
                  <h2 className="text-3xl md:text-5xl font-black">GESTÃO DE FROTAS</h2>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    Mantenha seus veículos em movimento. Com o módulo de Frotas, você controla a saúde mecânica dos ativos, gerencia motoristas e analisa indicadores operacionais para estender a vida útil de cada automóvel ou caminhão.
                  </p>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0" />
                        <span>Cadastro de Veículos e Subfrotas</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0" />
                        <span>Gestão de Uso e Alocação de Motoristas</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0" />
                        <span>Cronograma de Manutenção Preventiva</span>
                      </li>
                    </ul>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0" />
                        <span>Controle de Custos de Abastecimento</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0" />
                        <span>Rastreabilidade e Desgaste de Pneus</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0" />
                        <span>Painel Executivo de Custo por KM (CPK)</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Simulated Fleet Panel */}
                <div className="lg:col-span-5">
                  <div className="bg-white/5 border border-white/5 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                      <span className="text-[10px] text-muted-foreground font-mono">Status da Frota (Tempo Real)</span>
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Ativa
                      </span>
                    </div>

                    <div className="space-y-3">
                      {/* Active Fleet Progress */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Disponibilidade Física</span>
                          <span className="font-bold">24 / 25 Veículos</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 w-[96%]" />
                        </div>
                      </div>

                      {/* Mock Fleet Alert List */}
                      <div className="space-y-2 pt-2">
                        <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-amber-200">
                            <Clock size={14} className="shrink-0" />
                            <div>
                              <span className="font-bold block">Troca de Óleo Pendente</span>
                              <span className="text-[10px] text-slate-400">Gol Placa ABC-1234 • Há 350 km</span>
                            </div>
                          </div>
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded uppercase">Urgente</span>
                        </div>

                        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-emerald-200">
                            <CheckCircle2 size={14} className="shrink-0" />
                            <div>
                              <span className="font-bold block">Manutenção Preventiva</span>
                              <span className="text-[10px] text-slate-400">Scania Placa XYZ-9876 • Concluída</span>
                            </div>
                          </div>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded uppercase">OK</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 7 - INTELIGÊNCIA ARTIFICIAL (INTERACTIVE WIDGET) */}
            {currentSlide === 6 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
                <div className="lg:col-span-6 space-y-4 text-left">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-amber-400" size={20} />
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Motor Cognitivo Suzuki-AI</span>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black">INTELIGÊNCIA ARTIFICIAL</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    A Suzano IT incorpora modelos avançados de IA para eliminar digitação manual de notas fiscais, mapear falhas recorrentes com base em dados históricos e auxiliar no agendamento de preventivas.
                  </p>
                  
                  <div className="space-y-3 pt-2">
                    {[
                      "Geração de descrição de serviços para NF-e a partir de notas de rascunho.",
                      "Análise de histórico de manutenção para sugerir serviços correlatos.",
                      "Predição de vida útil de componentes críticos (Freios, pneus)."
                    ].map((feature, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live AI Simulation Interface */}
                <div className="lg:col-span-6">
                  <div className="bg-slate-900/60 border border-white/10 rounded-xl p-5 space-y-4 text-left relative">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                      <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                        <Cpu size={14} className="animate-pulse" /> Simulador de IA Integrado
                      </span>
                      <div className="flex gap-1">
                        {(['nfe', 'fault', 'suggest'] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => setAiType(type)}
                            className={`px-2 py-0.5 rounded text-[9px] font-semibold transition-all ${aiType === type ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                          >
                            {type === 'nfe' ? 'NF-e Descrição' : type === 'fault' ? 'Falha Preditiva' : 'Sugestão Peças'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase block mb-1">Rascunho de Entrada do Mecânico:</label>
                        <div className="bg-black/45 p-2.5 rounded border border-white/5 text-xs font-mono text-slate-300">
                          {aiInput}
                        </div>
                      </div>

                      <button
                        onClick={runAiSimulation}
                        disabled={isAiGenerating}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${isAiGenerating ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : style.button}`}
                      >
                        <Sparkles size={14} />
                        {isAiGenerating ? 'Processando Modelagem...' : 'Executar Análise por IA'}
                      </button>

                      {aiOutput && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-indigo-400 font-bold uppercase block">Retorno do Motor Suzuki-AI:</label>
                          <div className="bg-slate-950 p-3 rounded-lg border border-indigo-500/20 text-xs font-mono text-emerald-400 whitespace-pre-line leading-relaxed h-32 overflow-y-auto">
                            {aiOutput}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 8 - DIFERENCIAIS DA PLATAFORMA */}
            {currentSlide === 7 && (
              <div className="space-y-6 text-center max-w-4xl mx-auto w-full">
                <h2 className="text-3xl md:text-5xl font-black">NOSSOS DIFERENCIAIS</h2>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                  Entregamos tecnologia moderna, ágil e em total conformidade legal para que sua operação decolar sem travas.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                  {[
                    { label: "Plataforma SaaS Multi-Tenant", desc: "Isolamento total de dados e configurações por cliente.", value: "SaaS Ativo" },
                    { label: "Integração FIPE Nativa", desc: "Busca e atualização instantânea de valores de mercado de veículos.", value: "API FIPE" },
                    { label: "Integração ReceitaWS", desc: "Preenchimento automático de cadastros usando apenas CNPJ.", value: "API ReceitaWS" },
                    { label: "Emissão de NF-e Inteligente", desc: "Adequação tributária municipal e envio imediato ao cliente.", value: "Emissão Rápida" },
                    { label: "Segurança de Dados LGPD", desc: "Armazenamento criptografado e termo de consentimento digital.", value: "Conformidade" },
                    { label: "Escalabilidade e Nuvem", desc: "Deploy elástico em AWS com atualizações em tempo real sem interrupção.", value: "Elastic Cloud" },
                  ].map((diff, i) => (
                    <div key={i} className="p-4 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl text-left space-y-2 transition-all">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-300 font-bold px-2 py-0.5 rounded border border-indigo-500/20">
                          {diff.value}
                        </span>
                        <Check size={14} className="text-indigo-400" />
                      </div>
                      <h4 className="font-bold text-xs">{diff.label}</h4>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{diff.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SLIDE 9 - MODELO DE NEGÓCIO (INTERACTIVE CALCULATOR) */}
            {currentSlide === 8 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
                <div className="lg:col-span-6 space-y-4 text-left">
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${style.badge} tracking-wider`}>SaaS Recorrente (MRR)</span>
                  <h2 className="text-3xl md:text-5xl font-black">MODELO DE NEGÓCIOS</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Monetização por assinatura mensal recorrente estruturada em planos que acompanham o tamanho e a maturidade da operação do cliente.
                  </p>

                  <div className="space-y-4 pt-2">
                    {/* Simulated Fleet Input Range */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-semibold">Volume de Ordens de Serviço / Mês:</span>
                        <span className="font-bold text-indigo-400">{workOrders} OS</span>
                      </div>
                      <input 
                        type="range" 
                        min="5" 
                        max="800" 
                        value={workOrders} 
                        onChange={(e) => setWorkOrders(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>

                    {/* Simulated Fleet Size Range */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-semibold">Tamanho da Frota Ativa:</span>
                        <span className="font-bold text-indigo-400">{fleetSize} Veículos</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="300" 
                        value={fleetSize} 
                        onChange={(e) => setFleetSize(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Plan Recommendation & Savings Mock Card */}
                <div className="lg:col-span-6">
                  <div className="bg-slate-900/60 border border-white/10 rounded-xl p-5 space-y-4 text-left">
                    <div className="border-b border-white/5 pb-2.5 flex justify-between items-center">
                      <span className="text-xs font-bold text-indigo-400 flex items-center gap-1">
                        <Calculator size={14} /> Recomendação & Economia Estimada
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">Simulador Financeiro</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-white/5 border border-white/5 rounded-lg text-center">
                        <span className="text-[10px] text-muted-foreground block uppercase">Tempo Poupado</span>
                        <span className="text-xl font-bold text-slate-100 flex items-center justify-center gap-1">
                          <Clock size={16} className="text-indigo-400" /> {hoursSaved}h/mês
                        </span>
                      </div>
                      <div className="p-3 bg-white/5 border border-white/5 rounded-lg text-center">
                        <span className="text-[10px] text-muted-foreground block uppercase">Economia Gerada</span>
                        <span className="text-xl font-bold text-emerald-400 flex items-center justify-center gap-0.5">
                          R$ {estimatedSavings.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Highlight Recommended Tier */}
                    <div className="p-4 bg-indigo-500/10 border-2 border-indigo-500/30 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded uppercase">Plano Ideal</span>
                        <h4 className="text-lg font-black mt-1 text-slate-100">{recommendedPlan.name}</h4>
                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{recommendedPlan.desc}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black text-indigo-300">{recommendedPlan.price}</span>
                        <span className="text-[9px] block text-slate-400">Recorrência Mensal</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 10 - MERCADO ALVO */}
            {currentSlide === 9 && (
              <div className="space-y-6 text-center max-w-4xl mx-auto w-full">
                <h2 className="text-3xl md:text-5xl font-black">MERCADO ALVO</h2>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                  Amplo universo de prospecção comercial. Nosso SaaS atende desde operações enxutas de bairro a complexos de frotas e órgãos públicos de grande porte.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-6">
                  {[
                    { label: "Oficinas & Auto Centers", desc: "Aceleração de fluxo de OS e controle de caixa.", count: "100k+ oficinas" },
                    { label: "Frotas Corporativas", desc: "Rastreamento de custos, consumo e preventivas.", count: "Transportadoras" },
                    { label: "Locadoras & Cooperativas", desc: "Garantia de disponibilidade física dos ativos.", count: "Centrais" },
                    { label: "Concessionárias", desc: "Automação de balcão e integração com montadoras.", count: "Concessionárias" },
                    { label: "Prefeituras & Órgãos", desc: "Auditabilidade de gastos públicos em frotas.", count: "Licitações" },
                  ].map((target, idx) => (
                    <div key={idx} className="p-4 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl text-center space-y-2 flex flex-col justify-between transition-all">
                      <div className="space-y-1.5">
                        <h4 className="font-bold text-xs">{target.label}</h4>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{target.desc}</p>
                      </div>
                      <span className="text-[9px] font-bold text-indigo-300 mt-2 block font-mono">
                        {target.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SLIDE 11 - ARQUITETURA TECNOLÓGICA (INTERACTIVE DIAGRAM) */}
            {currentSlide === 10 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
                <div className="lg:col-span-5 space-y-4 text-left">
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${style.badge} tracking-wider`}>Stack Moderna & Segura</span>
                  <h2 className="text-3xl md:text-5xl font-black">ARQUITETURA</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Nossa stack foi selecionada para garantir baixíssima latência operacional, isolamento total por empresa e alta auditabilidade exigida por clientes corporativos e órgãos do governo.
                  </p>

                  <div className="space-y-3 pt-2">
                    {[
                      { l: "Frontend SPA", v: "React + TypeScript de alta velocidade." },
                      { l: "Backend JVM", v: "Kotlin + Spring Boot com APIs REST robustas." },
                      { l: "Persistência", v: "Banco de dados relacional PostgreSQL altamente otimizado." },
                      { l: "DevOps", v: "Containers Docker para isolamento e deploy elástico." },
                    ].map((item, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-bold text-indigo-300">{item.l}:</span>{' '}
                        <span className="text-muted-foreground">{item.v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tech Diagram Visualizer */}
                <div className="lg:col-span-7">
                  <div className="bg-slate-900/60 border border-white/10 rounded-xl p-5 space-y-6 text-left">
                    <span className="text-[10px] text-muted-foreground font-mono block">Fluxo da Requisição Multi-Tenant</span>
                    
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative">
                      
                      {/* Node 1 */}
                      <div className="w-full md:w-32 p-3 bg-white/5 border border-white/10 rounded-lg text-center relative z-10 flex flex-col items-center">
                        <Code2 size={20} className="text-blue-400 mb-1" />
                        <span className="text-xs font-bold block text-slate-100">CLIENT</span>
                        <span className="text-[8px] text-slate-400">React + TS</span>
                      </div>

                      <div className="text-slate-500 hidden md:block"><ArrowRight size={16} /></div>

                      {/* Node 2 */}
                      <div className="w-full md:w-32 p-3 bg-white/5 border border-white/10 rounded-lg text-center relative z-10 flex flex-col items-center">
                        <Cpu size={20} className="text-indigo-400 mb-1" />
                        <span className="text-xs font-bold block text-slate-100">GATEWAY</span>
                        <span className="text-[8px] text-slate-400">Security & JWT</span>
                      </div>

                      <div className="text-slate-500 hidden md:block"><ArrowRight size={16} /></div>

                      {/* Node 3 */}
                      <div className="w-full md:w-32 p-3 bg-white/5 border border-white/10 rounded-lg text-center relative z-10 flex flex-col items-center">
                        <Layers3 size={20} className="text-violet-400 mb-1" />
                        <span className="text-xs font-bold block text-slate-100">BACKEND</span>
                        <span className="text-[8px] text-slate-400">Kotlin + Spring</span>
                      </div>

                      <div className="text-slate-500 hidden md:block"><ArrowRight size={16} /></div>

                      {/* Node 4 */}
                      <div className="w-full md:w-32 p-3 bg-white/5 border border-white/10 rounded-lg text-center relative z-10 flex flex-col items-center">
                        <Database size={20} className="text-teal-400 mb-1" />
                        <span className="text-xs font-bold block text-slate-100">DATABASE</span>
                        <span className="text-[8px] text-slate-400">PostgreSQL</span>
                      </div>
                    </div>

                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-center">
                      <span className="text-[10px] text-indigo-300 block font-mono">Mecanismo Isolado Logic Tenant para LGPD e Segurança Global</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 12 - ROADMAP (INTERACTIVE TIMELINE) */}
            {currentSlide === 11 && (
              <div className="space-y-6 text-center max-w-5xl mx-auto w-full">
                <h2 className="text-3xl md:text-5xl font-black">ROADMAP</h2>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                  Nossa trilha planejada de evolução funcional. A plataforma encontra-se madura nas rotinas essenciais de oficina, frotas e fiscal.
                </p>

                {/* Horizontal Timeline Track */}
                <div className="relative pt-6 pb-2 overflow-x-auto">
                  <div className="absolute top-[52px] left-8 right-8 h-1 bg-slate-800 z-0 hidden md:block" />
                  
                  <div className="flex flex-col md:flex-row justify-between items-start gap-6 md:gap-2">
                    {[
                      { title: "Fase 1", desc: "Gestão de Oficina", status: "Concluído", c: "bg-emerald-500" },
                      { title: "Fase 2", desc: "Gestão de Frota", status: "Concluído", c: "bg-emerald-500" },
                      { title: "Fase 3", desc: "Integração NF-e", status: "Concluído", c: "bg-emerald-500" },
                      { title: "Fase 4", desc: "Inteligência Artificial", status: "Concluído", c: "bg-emerald-500" },
                      { title: "Fase 5", desc: "Aplicativo Mobile", status: "Próximo", c: "bg-indigo-500 animate-pulse" },
                      { title: "Fase 6", desc: "Marketplace de Serviços", status: "Futuro", c: "bg-slate-700" },
                      { title: "Fase 7", desc: "BI Avançado & Analytics", status: "Futuro", c: "bg-slate-700" }
                    ].map((step, idx) => (
                      <div key={idx} className="flex md:flex-col items-center md:items-center gap-4 md:gap-2 text-left md:text-center w-full relative z-10">
                        {/* Status Circle */}
                        <div className={`w-8 h-8 rounded-full ${step.c} flex items-center justify-center text-xs font-bold text-black border-4 border-slate-950 font-sans`}>
                          {idx < 4 ? '✓' : idx === 4 ? '▶' : idx + 1}
                        </div>
                        
                        <div className="md:mt-2">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">{step.title}</span>
                          <span className="text-xs font-bold block text-slate-200 leading-tight mt-0.5">{step.desc}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase inline-block mt-1 ${idx < 4 ? 'bg-emerald-500/10 text-emerald-300' : idx === 4 ? 'bg-indigo-500/10 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
                            {step.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 13 - BENEFÍCIOS PARA O CLIENTE */}
            {currentSlide === 12 && (
              <div className="space-y-6 text-center max-w-4xl mx-auto w-full">
                <h2 className="text-3xl md:text-5xl font-black">BENEFÍCIOS REAIS</h2>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                  A Suzano IT gera impacto real no faturamento operacional, produtividade e governança corporativa de nossos parceiros comerciais.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6">
                  {[
                    { label: "Redução de Custos", desc: "Controle preventivo evita quebras de veículos e ociosidade de motoristas.", icon: <TrendingUp className="text-emerald-400" /> },
                    { label: "Organização Operacional", desc: "Processo digital padronizado do agendamento ao faturamento.", icon: <CheckCircle2 className="text-blue-400" /> },
                    { label: "Decisão Ágil com BI", desc: "Métricas consolidadas de CPK, ticket médio e lucratividade imediata.", icon: <BarChart3 className="text-indigo-400" /> },
                    { label: "Segurança de TI", desc: "Software multi-tenant de alta confiabilidade em conformidade com LGPD.", icon: <ShieldCheck className="text-cyan-400" /> }
                  ].map((benefit, i) => (
                    <div key={i} className="p-5 bg-white/5 border border-white/5 rounded-xl text-center space-y-3 transition-all hover:bg-white/10">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-indigo-400">
                        {benefit.icon}
                      </div>
                      <h4 className="font-bold text-sm text-slate-100">{benefit.label}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{benefit.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SLIDE 14 - ENCERRAMENTO */}
            {currentSlide === 13 && (
              <div className="space-y-8 text-center max-w-3xl mx-auto">
                <div className="space-y-3">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${style.badge} tracking-widest uppercase`}>
                    Suzano IT • Tecnologia Automotiva
                  </span>
                  <h1 className="text-4xl md:text-6xl font-black">SUZANO IT</h1>
                  <p className="text-lg md:text-xl text-muted-foreground font-light max-w-xl mx-auto leading-relaxed">
                    Transformando a Gestão de Oficinas e Frotas com Tecnologia e Inteligência Artificial.
                  </p>
                </div>

                <div className="p-6 bg-white/5 border border-white/5 rounded-xl max-w-md mx-auto space-y-3 text-left">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Globe size={16} className="text-indigo-400" />
                    <span>Website: <strong>www.suzanoit.com.br</strong></span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Mail size={16} className="text-indigo-400" />
                    <span>E-mail: <strong>contato@suzanoit.com.br</strong></span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Award size={16} className="text-indigo-400" />
                    <span>Slogan: <strong>"Mais controle. Mais produtividade. Mais resultado."</strong></span>
                  </div>
                </div>

                <div className="pt-2 text-xs text-muted-foreground/60">
                  © {new Date().getFullYear()} Suzano IT. Todos os direitos reservados.
                </div>
              </div>
            )}

          </div>

          {/* NEXT SLIDE INDICATOR RIGHT */}
          <button 
            onClick={nextSlide}
            className="absolute right-2 md:right-6 p-3 rounded-full bg-black/20 hover:bg-black/40 border border-white/5 text-slate-400 hover:text-white transition-all transform hover:scale-105 z-20"
            aria-label="Próximo Slide"
          >
            <ChevronRight size={24} />
          </button>

          {/* BOTTOM CONTROLLER BAR */}
          <div className="mt-6 border-t border-white/5 pt-4 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="text-xs text-muted-foreground font-mono order-2 md:order-1">
              Use as setas do teclado (Esquerda / Direita) ou clique nos botões para navegar.
            </div>

            {/* Slide Selection Dots */}
            <div className="flex flex-wrap justify-center gap-1.5 order-1 md:order-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-3.5 h-1.5 rounded-full transition-all ${currentSlide === idx ? style.progressFill + ' w-6' : 'bg-slate-700 hover:bg-slate-500'}`}
                  title={`Ir para Slide ${idx + 1}`}
                  aria-label={`Ir para Slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Thumbnail Drawer Trigger */}
            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className={`px-3 py-1 text-xs rounded border border-white/5 text-slate-400 hover:text-white bg-white/5 transition-colors order-3`}
            >
              {showThumbnails ? 'Ocultar Miniaturas' : 'Ver Todos os Slides'}
            </button>
          </div>
        </div>
      </main>

      {/* THUMBNAIL BOTTOM GRID DRAWER */}
      {showThumbnails && (
        <div className="relative z-20 w-full bg-slate-900/95 border-t border-white/10 p-4 transition-all duration-300">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Painel de Miniaturas</span>
              <button 
                onClick={() => setShowThumbnails(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Fechar
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 overflow-y-auto max-h-48 pr-2">
              {slides.map((slide, idx) => (
                <button
                  key={slide.id}
                  onClick={() => {
                    setCurrentSlide(idx);
                    setShowThumbnails(false);
                  }}
                  className={`p-2.5 rounded-lg text-left transition-all border ${currentSlide === idx ? 'bg-indigo-500/20 border-indigo-500 text-white' : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200'}`}
                >
                  <span className="text-[10px] font-mono text-indigo-400 block mb-0.5">SLIDE {slide.id}</span>
                  <span className="text-[11px] font-bold block truncate leading-tight">{slide.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Footer Branding */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-muted-foreground/60 border-t border-white/5 bg-black/10">
        Apresentação Corporativa Suzano IT • © {new Date().getFullYear()} Suzano IT
      </footer>
    </div>
  );
}
