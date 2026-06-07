import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_presentation():
    prs = Presentation()
    # Set slide dimensions to widescreen 16:9
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    
    # Theme Colors
    BG_COLOR = RGBColor(8, 11, 17)        # Slate Dark
    TEXT_WHITE = RGBColor(248, 250, 252) # Main Text
    TEXT_MUTED = RGBColor(148, 163, 184) # Muted/Body Text
    COLOR_INDIGO = RGBColor(99, 102, 241) # Primary Accent
    COLOR_SKY = RGBColor(56, 189, 248)    # Highlight Accent
    COLOR_RED = RGBColor(248, 113, 113)   # Warning Accent
    COLOR_CARD_BG = RGBColor(16, 23, 37)  # Card Background
    
    # Slide layouts (6 is blank in default template)
    blank_layout = prs.slide_layouts[6]
    
    def set_dark_background(slide):
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = BG_COLOR
        
    def add_header(slide, title_text, category_text="PLATAFORMA SAAS"):
        # Category tag
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(8), Inches(0.4))
        cat_tf = cat_box.text_frame
        cat_tf.word_wrap = True
        p_cat = cat_tf.paragraphs[0]
        p_cat.text = category_text.upper()
        p_cat.font.name = 'Arial'
        p_cat.font.size = Pt(10)
        p_cat.font.bold = True
        p_cat.font.color.rgb = COLOR_SKY
        
        # Slide Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.5), Inches(0.8))
        title_tf = title_box.text_frame
        title_tf.word_wrap = True
        title_tf.margin_left = Inches(0)
        p_title = title_tf.paragraphs[0]
        p_title.text = title_text
        p_title.font.name = 'Arial'
        p_title.font.size = Pt(28)
        p_title.font.bold = True
        p_title.font.color.rgb = TEXT_WHITE
        
    def add_footer(slide, current_page, total_pages=14):
        # Footer text
        footer_box = slide.shapes.add_textbox(Inches(0.8), Inches(7.0), Inches(11.7), Inches(0.4))
        footer_tf = footer_box.text_frame
        p_foot = footer_tf.paragraphs[0]
        p_foot.text = f"SUZANO IT   |   Tecnologia para Oficinas e Frotas                                                                                   Slide {current_page} de {total_pages}"
        p_foot.font.name = 'Arial'
        p_foot.font.size = Pt(8.5)
        p_foot.font.color.rgb = TEXT_MUTED
        
    def draw_card(slide, left, top, width, height, bg_color):
        shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
        shape.fill.solid()
        shape.fill.fore_color.rgb = bg_color
        shape.line.color.rgb = RGBColor(30, 41, 59) # Slate Border
        shape.line.width = Pt(1)
        return shape

    # ==========================================
    # SLIDE 1 - CAPA
    # ==========================================
    slide = prs.slides.add_slide(blank_layout)
    set_dark_background(slide)
    
    # Glowing decorative block
    draw_card(slide, Inches(0.8), Inches(2.2), Inches(0.15), Inches(3.2), COLOR_INDIGO)
    
    # Capa Text Box
    capa_box = slide.shapes.add_textbox(Inches(1.2), Inches(2.1), Inches(10.5), Inches(4))
    tf = capa_box.text_frame
    tf.word_wrap = True
    
    p_main = tf.paragraphs[0]
    p_main.text = "SUZANO IT"
    p_main.font.name = 'Arial'
    p_main.font.size = Pt(64)
    p_main.font.bold = True
    p_main.font.color.rgb = TEXT_WHITE
    p_main.space_after = Pt(12)
    
    p_slog = tf.add_paragraph()
    p_slog.text = "Tecnologia Inteligente para Gestão de Oficinas e Frotas"
    p_slog.font.name = 'Arial'
    p_slog.font.size = Pt(24)
    p_slog.font.bold = False
    p_slog.font.color.rgb = COLOR_SKY
    p_slog.space_after = Pt(28)
    
    bullets = [
        "Plataforma SaaS Multiempresa (Multi-Tenant)",
        "Inteligência Artificial aplicada ao pós-venda automotivo",
        "Gestão unificada de ordens de serviço, peças, financeiros e frotas"
    ]
    
    for b in bullets:
        p_b = tf.add_paragraph()
        p_b.text = f"•  {b}"
        p_b.font.name = 'Arial'
        p_b.font.size = Pt(14)
        p_b.font.color.rgb = TEXT_MUTED
        p_b.space_after = Pt(4)
        
    add_footer(slide, 1)

    # ==========================================
    # SLIDE 2 - QUEM SOMOS
    # ==========================================
    slide = prs.slides.add_slide(blank_layout)
    set_dark_background(slide)
    add_header(slide, "Quem Somos", "Apresentação Institucional")
    
    # Left description box
    desc_box = slide.shapes.add_textbox(Inches(0.8), Inches(2.0), Inches(5.5), Inches(4.5))
    tf_desc = desc_box.text_frame
    tf_desc.word_wrap = True
    p_desc = tf_desc.paragraphs[0]
    p_desc.text = "A Suzano IT é uma empresa de tecnologia especializada no desenvolvimento de ecossistemas digitais para o setor automotivo.\n\nNosso propósito é reinventar a forma como oficinas mecânicas, auto centers e gestores de frota operam no dia a dia, eliminando controles manuais e proporcionando inteligência e redução de custos reais através de automação na nuvem."
    p_desc.font.name = 'Arial'
    p_desc.font.size = Pt(18)
    p_desc.font.color.rgb = TEXT_MUTED
    p_desc.space_after = Pt(14)
    
    # Right pillars box (cards layout)
    pillars = [
        ("Arquitetura 100% em Nuvem", "Acessível de qualquer lugar, dispensando servidores locais."),
        ("Multiempresa (Multi-Tenant)", "Ideal para redes de oficinas e controle de múltiplas filiais."),
        ("Inteligência Artificial", "Suzuki-AI aplicada à otimização e produtividade operacional.")
    ]
    
    top_offset = 2.0
    for title, text in pillars:
        draw_card(slide, Inches(6.8), Inches(top_offset), Inches(5.7), Inches(1.3), COLOR_CARD_BG)
        card_box = slide.shapes.add_textbox(Inches(7.0), Inches(top_offset + 0.1), Inches(5.3), Inches(1.1))
        tf_card = card_box.text_frame
        tf_card.word_wrap = True
        
        p_title = tf_card.paragraphs[0]
        p_title.text = title
        p_title.font.name = 'Arial'
        p_title.font.size = Pt(15)
        p_title.font.bold = True
        p_title.font.color.rgb = COLOR_SKY
        p_title.space_after = Pt(4)
        
        p_text = tf_card.add_paragraph()
        p_text.text = text
        p_text.font.name = 'Arial'
        p_text.font.size = Pt(12)
        p_text.font.color.rgb = TEXT_MUTED
        
        top_offset += 1.6
        
    add_footer(slide, 2)

    # ==========================================
    # SLIDE 3 - PROBLEMAS DO MERCADO
    # ==========================================
    slide = prs.slides.add_slide(blank_layout)
    set_dark_background(slide)
    add_header(slide, "Problemas do Mercado", "Gargalos do Setor")
    
    # Left Column: List of Pain Points
    left_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(5.8), Inches(4.8))
    tf_left = left_box.text_frame
    tf_left.word_wrap = True
    
    p_head = tf_left.paragraphs[0]
    p_head.text = "Desafios em oficinas e gestão de frotas:"
    p_head.font.name = 'Arial'
    p_head.font.size = Pt(18)
    p_head.font.bold = True
    p_head.font.color.rgb = TEXT_WHITE
    p_head.space_after = Pt(14)
    
    pains = [
        "Controle manual de ordens de serviço e histórico lento.",
        "Falta de rastreabilidade na substituição e cotação de peças.",
        "Processos financeiros sem conciliação e com alta inadimplência.",
        "Falta de indicadores executivos de desempenho da operação.",
        "Desperdício de ativos em frotas por falta de preventiva.",
        "Sistemas antigos desconectados ou planilhas difíceis."
    ]
    for pain in pains:
        p_pain = tf_left.add_paragraph()
        p_pain.text = f"❌  {pain}"
        p_pain.font.name = 'Arial'
        p_pain.font.size = Pt(13)
        p_pain.font.color.rgb = TEXT_MUTED
        p_pain.space_after = Pt(10)
        
    # Right Column: Impacts Box (Warning Style)
    draw_card(slide, Inches(7.0), Inches(1.8), Inches(5.5), Inches(4.5), RGBColor(28, 18, 22))
    right_box = slide.shapes.add_textbox(Inches(7.3), Inches(2.1), Inches(4.9), Inches(3.9))
    tf_right = right_box.text_frame
    tf_right.word_wrap = True
    
    p_warn_head = tf_right.paragraphs[0]
    p_warn_head.text = "IMPACTOS FINANCEIROS DIRETOS"
    p_warn_head.font.name = 'Arial'
    p_warn_head.font.size = Pt(14)
    p_warn_head.font.bold = True
    p_warn_head.font.color.rgb = COLOR_RED
    p_warn_head.space_after = Pt(14)
    
    p_warn_body = tf_right.add_paragraph()
    p_warn_body.text = "A ineficiência operacional do controle manual gera desperdícios graves:\n\n•  Perda financeira de até 15% por vazamento de caixa e faturamento incorreto.\n•  Redução drástica de produtividade dos mecânicos e frotas paradas por quebra corretiva.\n•  Dificuldade gerencial por falta de dados para tomadas de decisão rápidas."
    p_warn_body.font.name = 'Arial'
    p_warn_body.font.size = Pt(15)
    p_warn_body.font.color.rgb = TEXT_MUTED
    p_warn_body.space_after = Pt(14)
    
    add_footer(slide, 3)

    # ==========================================
    # SLIDE 4 - NOSSA SOLUÇÃO
    # ==========================================
    slide = prs.slides.add_slide(blank_layout)
    set_dark_background(slide)
    add_header(slide, "Nossa Solução", "Ecossistema Suzano IT")
    
    sol_intro = slide.shapes.add_textbox(Inches(0.8), Inches(1.7), Inches(11.7), Inches(0.8))
    tf_intro = sol_intro.text_frame
    p_intro = tf_intro.paragraphs[0]
    p_intro.text = "Centralizamos toda a gestão operacional, de frotas e financeira em um único ecossistema em nuvem."
    p_intro.font.name = 'Arial'
    p_intro.font.size = Pt(18)
    p_intro.font.color.rgb = TEXT_MUTED
    
    # 4 Cards representing features
    solutions = [
        ("Gestão de Oficina", "Ordens de serviço digitais, controle completo de peças, cadastros de clientes e histórico por placa."),
        ("Gestão de Frotas", "Controle inteligente de pneus, consumo de combustível, motoristas e planos de manutenção preventiva."),
        ("Controle Financeiro", "Contas a pagar/receber integradas à operação, DRE estruturado e acompanhamento de fluxo de caixa."),
        ("Inteligência Artificial", "Modelagem preditiva Suzuki-AI para geração automática de NF-e e diagnósticos de desgaste.")
    ]
    
    left_positions = [0.8, 3.8, 6.8, 9.8]
    for i, (title, desc) in enumerate(solutions):
        draw_card(slide, Inches(left_positions[i]), Inches(2.6), Inches(2.733), Inches(3.8), COLOR_CARD_BG)
        box = slide.shapes.add_textbox(Inches(left_positions[i] + 0.1), Inches(2.8), Inches(2.533), Inches(3.4))
        tf_sol = box.text_frame
        tf_sol.word_wrap = True
        
        p_t = tf_sol.paragraphs[0]
        p_t.text = title
        p_t.font.name = 'Arial'
        p_t.font.size = Pt(18)
        p_t.font.bold = True
        p_t.font.color.rgb = COLOR_SKY
        p_t.space_after = Pt(12)
        
        p_d = tf_sol.add_paragraph()
        p_d.text = desc
        p_d.font.name = 'Arial'
        p_d.font.size = Pt(13)
        p_d.font.color.rgb = TEXT_MUTED
        
    add_footer(slide, 4)

    # ==========================================
    # SLIDE 5 - GESTÃO DE OFICINA
    # ==========================================
    slide = prs.slides.add_slide(blank_layout)
    set_dark_background(slide)
    add_header(slide, "Módulo: Gestão de Oficina", "Operação Integrada")
    
    # Left Column: Features
    left_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(5.8), Inches(4.8))
    tf_left = left_box.text_frame
    tf_left.word_wrap = True
    
    p_head = tf_left.paragraphs[0]
    p_head.text = "Controle absoluto da oficina mecânica:"
    p_head.font.name = 'Arial'
    p_head.font.size = Pt(18)
    p_head.font.bold = True
    p_head.font.color.rgb = TEXT_WHITE
    p_head.space_after = Pt(14)
    
    features = [
        "Cadastro rápido de clientes e veículos integrados.",
        "Orçamentos comerciais digitais com envio em 1 clique.",
        "Ordens de serviço com controle de horas trabalhadas.",
        "Gestão de estoque de peças com reposição sugerida.",
        "Controle de comissões de mecânicos e consultores.",
        "Emissão de Notas Fiscais Eletrônicas de Serviço (NF-e)."
    ]
    for feat in features:
        p_feat = tf_left.add_paragraph()
        p_feat.text = f"✓  {feat}"
        p_feat.font.name = 'Arial'
        p_feat.font.size = Pt(14)
        p_feat.font.color.rgb = TEXT_MUTED
        p_feat.space_after = Pt(10)
        
    # Right Column: Results Card
    draw_card(slide, Inches(7.0), Inches(1.8), Inches(5.5), Inches(4.5), COLOR_CARD_BG)
    right_box = slide.shapes.add_textbox(Inches(7.3), Inches(2.1), Inches(4.9), Inches(3.9))
    tf_right = right_box.text_frame
    tf_right.word_wrap = True
    
    p_res_head = tf_right.paragraphs[0]
    p_res_head.text = "RESULTADOS OPERACIONAIS"
    p_res_head.font.name = 'Arial'
    p_res_head.font.size = Pt(14)
    p_res_head.font.bold = True
    p_res_head.font.color.rgb = COLOR_SKY
    p_res_head.space_after = Pt(18)
    
    p_res_body = tf_right.add_paragraph()
    p_res_body.text = "A digitalização de processos da Suzano IT gera impacto instantâneo:\n\n•  Organização completa do pátio mecânico.\n•  Melhoria média de 20% no faturamento bruto.\n•  Eliminação de erros de digitação e retrabalho.\n•  Aumento de confiança do cliente final com laudo online."
    p_res_body.font.name = 'Arial'
    p_res_body.font.size = Pt(15)
    p_res_body.font.color.rgb = TEXT_MUTED
    
    add_footer(slide, 5)

    # ==========================================
    # SLIDE 6 - GESTÃO DE FROTAS
    # ==========================================
    slide = prs.slides.add_slide(blank_layout)
    set_dark_background(slide)
    add_header(slide, "Módulo: Gestão de Frotas", "Controle de Ativos")
    
    # Left Column: Features
    left_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(5.8), Inches(4.8))
    tf_left = left_box.text_frame
    tf_left.word_wrap = True
    
    p_head = tf_left.paragraphs[0]
    p_head.text = "Visão geral e preventiva da frota:"
    p_head.font.name = 'Arial'
    p_head.font.size = Pt(18)
    p_head.font.bold = True
    p_head.font.color.rgb = TEXT_WHITE
    p_head.space_after = Pt(14)
    
    features = [
        "Cadastro de veículos e subfrotas organizacionais.",
        "Gestão ativa de condutores e histórico de multas.",
        "Controle de abastecimento, média de consumo e CPK.",
        "Manutenção preventiva com alertas baseados em KM/Tempo.",
        "Controle de vida útil de pneus com histórico de rodagem.",
        "Rastreabilidade de custos e controle financeiro de ativos."
    ]
    for feat in features:
        p_feat = tf_left.add_paragraph()
        p_feat.text = f"✓  {feat}"
        p_feat.font.name = 'Arial'
        p_feat.font.size = Pt(14)
        p_feat.font.color.rgb = TEXT_MUTED
        p_feat.space_after = Pt(10)
        
    # Right Column: Results Card
    draw_card(slide, Inches(7.0), Inches(1.8), Inches(5.5), Inches(4.5), COLOR_CARD_BG)
    right_box = slide.shapes.add_textbox(Inches(7.3), Inches(2.1), Inches(4.9), Inches(3.9))
    tf_right = right_box.text_frame
    tf_right.word_wrap = True
    
    p_res_head = tf_right.paragraphs[0]
    p_res_head.text = "BENEFÍCIOS NA GESTÃO DE FROTA"
    p_res_head.font.name = 'Arial'
    p_res_head.font.size = Pt(14)
    p_res_head.font.bold = True
    p_res_head.font.color.rgb = COLOR_SKY
    p_res_head.space_after = Pt(18)
    
    p_res_body = tf_right.add_paragraph()
    p_res_body.text = "Economia em escala para empresas frotistas:\n\n•  Redução de custos operacionais diretos por manutenção planejada.\n•  Maior disponibilidade física dos veículos nas ruas.\n•  Prevenção de quebras graves e paradas indesejadas.\n•  Auditoria de consumo de combustível simplificada."
    p_res_body.font.name = 'Arial'
    p_res_body.font.size = Pt(15)
    p_res_body.font.color.rgb = TEXT_MUTED
    
    add_footer(slide, 6)

    # ==========================================
    # SLIDE 7 - INTELIGÊNCIA ARTIFICIAL
    # ==========================================
    slide = prs.slides.add_slide(blank_layout)
    set_dark_background(slide)
    add_header(slide, "Inteligência Artificial Integrada", "Tecnologia Suzuki-AI")
    
    left_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(5.8), Inches(4.8))
    tf_left = left_box.text_frame
    tf_left.word_wrap = True
    
    p_head = tf_left.paragraphs[0]
    p_head.text = "Inteligência operacional no pós-venda:"
    p_head.font.name = 'Arial'
    p_head.font.size = Pt(18)
    p_head.font.bold = True
    p_head.font.color.rgb = TEXT_WHITE
    p_head.space_after = Pt(14)
    
    features = [
        "Geração de descrição de serviços para NF-e a partir de rascunhos informais.",
        "Sugestão preditiva de serviços adicionais baseada no modelo de uso do carro.",
        "Análise estatística para identificação preditiva de padrões de falhas mecânicas.",
        "Relatórios inteligentes para tomadas de decisão sem complexidade.",
        "Dashboards preditivos com alertas antecipados de manutenção crítica."
    ]
    for feat in features:
        p_feat = tf_left.add_paragraph()
        p_feat.text = f"✨  {feat}"
        p_feat.font.name = 'Arial'
        p_feat.font.size = Pt(14)
        p_feat.font.color.rgb = TEXT_MUTED
        p_feat.space_after = Pt(10)
        
    # Right Column: AI Simulation Example
    draw_card(slide, Inches(7.0), Inches(1.8), Inches(5.5), Inches(4.5), COLOR_CARD_BG)
    right_box = slide.shapes.add_textbox(Inches(7.3), Inches(2.1), Inches(4.9), Inches(3.9))
    tf_right = right_box.text_frame
    tf_right.word_wrap = True
    
    p_res_head = tf_right.paragraphs[0]
    p_res_head.text = "EXEMPLO DE USO PRÁTICO (SUZUKI-AI)"
    p_res_head.font.name = 'Arial'
    p_res_head.font.size = Pt(14)
    p_res_head.font.bold = True
    p_res_head.font.color.rgb = COLOR_SKY
    p_res_head.space_after = Pt(10)
    
    p_res_body = tf_right.add_paragraph()
    p_res_body.text = "Rascunho de Entrada do Mecânico:\n'troca oleo velas filtro ar Corolla'\n\nRetorno da IA de Faturamento:\n'Prestação de serviços mecânicos englobando diagnóstico computadorizado de injeção, substituição preventiva do filtro de ar e velas de ignição originais, com revisão detalhada do plano de lubrificação do motor.'\n\nBenefício: Economia de tempo administrativa de recepção."
    p_res_body.font.name = 'Arial'
    p_res_body.font.size = Pt(13)
    p_res_body.font.color.rgb = TEXT_MUTED
    
    add_footer(slide, 7)

    # ==========================================
    # SLIDE 8 - DIFERENCIAIS
    # ==========================================
    slide = prs.slides.add_slide(blank_layout)
    set_dark_background(slide)
    add_header(slide, "Diferenciais Competitivos", "Por que a Suzano IT?")
    
    diffs = [
        ("SaaS Multiempresa", "Isolamento lógico absoluto e suporte completo para franquias e filiais."),
        ("Tabela FIPE Nativa", "Valores atualizados de mercado integrados diretamente às fichas do veículo."),
        ("ReceitaWS Integrada", "Preenchimento imediato de cadastros de pessoas jurídicas usando apenas CNPJ."),
        ("Faturamento NF-e", "Emissão tributária ágil em conformidade com as legislações vigentes."),
        ("Segurança & LGPD", "Dados protegidos com criptografia de alto nível e políticas rígidas de acesso."),
        ("Cloud Elasticidade", "Hospedagem elástica AWS e atualizações automáticas sem necessidade de intervenção.")
    ]
    
    x_positions = [0.8, 4.8, 8.8]
    y_positions = [2.0, 4.4]
    
    for idx, (title, desc) in enumerate(diffs):
        col = idx % 3
        row = idx // 3
        left = x_positions[col]
        top = y_positions[row]
        
        draw_card(slide, Inches(left), Inches(top), Inches(3.733), Inches(2.0), COLOR_CARD_BG)
        box = slide.shapes.add_textbox(Inches(left + 0.1), Inches(top + 0.1), Inches(3.533), Inches(1.8))
        tf_card = box.text_frame
        tf_card.word_wrap = True
        
        p_t = tf_card.paragraphs[0]
        p_t.text = title
        p_t.font.name = 'Arial'
        p_t.font.size = Pt(16)
        p_t.font.bold = True
        p_t.font.color.rgb = COLOR_SKY
        p_t.space_after = Pt(8)
        
        p_d = tf_card.add_paragraph()
        p_d.text = desc
        p_d.font.name = 'Arial'
        p_d.font.size = Pt(12)
        p_d.font.color.rgb = TEXT_MUTED
        
    add_footer(slide, 8)

    # ==========================================
    # SLIDE 9 - MODELO DE NEGÓCIO
    # ==========================================
    slide = prs.slides.add_slide(blank_layout)
    set_dark_background(slide)
    add_header(slide, "Modelo de Negócio", "Monetização SaaS")
    
    intro_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.6), Inches(11.7), Inches(0.6))
    tf_intro = intro_box.text_frame
    p_intro = tf_intro.paragraphs[0]
    p_intro.text = "Assinaturas mensais recorrentes (MRR) estruturadas para crescer conforme o uso e porte do cliente."
    p_intro.font.name = 'Arial'
    p_intro.font.size = Pt(16)
    p_intro.font.color.rgb = TEXT_MUTED
    
    plans = [
        ("STARTER", "R$ 199 / mês", "Pequenas Oficinas", [
            "Funcionalidades essenciais",
            "Gestão de OS e Cadastros",
            "Orçamentos comerciais",
            "Suporte digital básico"
        ]),
        ("PROFESSIONAL", "R$ 499 / mês", "Empresas em Crescimento", [
            "Gestão de Oficina completa",
            "Módulo de Frotas básico",
            "Controle financeiro avançado",
            "Emissão integrada de NF-e"
        ]),
        ("ENTERPRISE", "Sob Consulta", "Grandes Operações", [
            "Frotistas e transportadoras",
            "Integrações de API personalizadas",
            "Arquitetura sob demanda",
            "Suporte e SLA dedicado"
        ])
    ]
    
    left_positions = [0.8, 4.8, 8.8]
    for i, (name, price, target, features) in enumerate(plans):
        bg = COLOR_CARD_BG if name != "PROFESSIONAL" else RGBColor(18, 30, 49)
        draw_card(slide, Inches(left_positions[i]), Inches(2.3), Inches(3.733), Inches(4.3), bg)
        
        box = slide.shapes.add_textbox(Inches(left_positions[i] + 0.1), Inches(2.5), Inches(3.533), Inches(3.9))
        tf_plan = box.text_frame
        tf_plan.word_wrap = True
        
        p_n = tf_plan.paragraphs[0]
        p_n.text = name
        p_n.font.name = 'Arial'
        p_n.font.size = Pt(18)
        p_n.font.bold = True
        p_n.font.color.rgb = COLOR_SKY if name != "PROFESSIONAL" else COLOR_INDIGO
        p_n.space_after = Pt(4)
        
        p_p = tf_plan.add_paragraph()
        p_p.text = price
        p_p.font.name = 'Arial'
        p_p.font.size = Pt(22)
        p_p.font.bold = True
        p_p.font.color.rgb = TEXT_WHITE
        p_p.space_after = Pt(2)
        
        p_t = tf_plan.add_paragraph()
        p_t.text = target
        p_t.font.name = 'Arial'
        p_t.font.size = Pt(12)
        p_t.font.color.rgb = TEXT_MUTED
        p_t.space_after = Pt(18)
        
        for feat in features:
            p_f = tf_plan.add_paragraph()
            p_f.text = f"•  {feat}"
            p_f.font.name = 'Arial'
            p_f.font.size = Pt(12)
            p_f.font.color.rgb = TEXT_MUTED
            p_f.space_after = Pt(6)
            
    add_footer(slide, 9)

    # ==========================================
    # SLIDE 10 - MERCADO
    # ==========================================
    slide = prs.slides.add_slide(blank_layout)
    set_dark_background(slide)
    add_header(slide, "Mercado Alvo", "Público e Potencial")
    
    left_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(5.8), Inches(4.8))
    tf_left = left_box.text_frame
    tf_left.word_wrap = True
    
    p_head = tf_left.paragraphs[0]
    p_head.text = "Quem são nossos clientes:"
    p_head.font.name = 'Arial'
    p_head.font.size = Pt(18)
    p_head.font.bold = True
    p_head.font.color.rgb = TEXT_WHITE
    p_head.space_after = Pt(14)
    
    targets = [
        "Oficinas mecânicas e auto centers independentes.",
        "Transportadoras, frotas corporativas e logísticas.",
        "Locadoras de veículos e cooperativas de táxi/aplicativos.",
        "Concessionárias de veículos e redes de autopeças.",
        "Prefeituras municipais e órgãos governamentais."
    ]
    for target in targets:
        p_t = tf_left.add_paragraph()
        p_t.text = f"•  {target}"
        p_t.font.name = 'Arial'
        p_t.font.size = Pt(14)
        p_t.font.color.rgb = TEXT_MUTED
        p_t.space_after = Pt(12)
        
    # Right Column
    draw_card(slide, Inches(7.0), Inches(1.8), Inches(5.5), Inches(4.5), COLOR_CARD_BG)
    right_box = slide.shapes.add_textbox(Inches(7.3), Inches(2.1), Inches(4.9), Inches(3.9))
    tf_right = right_box.text_frame
    tf_right.word_wrap = True
    
    p_res_head = tf_right.paragraphs[0]
    p_res_head.text = "POTENCIAL DE CRESCIMENTO"
    p_res_head.font.name = 'Arial'
    p_res_head.font.size = Pt(14)
    p_res_head.font.bold = True
    p_res_head.font.color.rgb = COLOR_SKY
    p_res_head.space_after = Pt(18)
    
    p_res_body = tf_right.add_paragraph()
    p_res_body.text = "O mercado brasileiro conta com mais de 100 mil oficinas de pós-venda cadastradas e um crescimento acelerado no número de empresas optando por gerenciar frotas próprias para reduzir custos de distribuição.\n\nA digitalização e a inteligência operacional são as maiores prioridades para o setor nos próximos anos."
    p_res_body.font.name = 'Arial'
    p_res_body.font.size = Pt(15)
    p_res_body.font.color.rgb = TEXT_MUTED
    
    add_footer(slide, 10)

    # ==========================================
    # SLIDE 11 - ARQUITETURA
    # ==========================================
    slide = prs.slides.add_slide(blank_layout)
    set_dark_background(slide)
    add_header(slide, "Arquitetura Tecnológica", "Tecnologia e Performance")
    
    # 4 Components Side by Side
    techs = [
        ("Frontend", "React\nTypeScript\nTailwind CSS\n\n•  Interface SPA responsiva e veloz."),
        ("Backend", "Kotlin\nSpring Boot\nJava Virtual Machine\n\n•  Segurança robusta e performance corporativa."),
        ("Banco de Dados", "PostgreSQL\n\n\n•  Persistência relacional estável com alta auditabilidade."),
        ("Segurança & Cloud", "JWT Autenticação\nDocker Containers\nAWS Cloud\n\n•  Segurança corporativa aderente à LGPD.")
    ]
    
    left_positions = [0.8, 3.8, 6.8, 9.8]
    for i, (name, details) in enumerate(techs):
        draw_card(slide, Inches(left_positions[i]), Inches(2.0), Inches(2.733), Inches(4.3), COLOR_CARD_BG)
        box = slide.shapes.add_textbox(Inches(left_positions[i] + 0.1), Inches(2.2), Inches(2.533), Inches(3.9))
        tf_tech = box.text_frame
        tf_tech.word_wrap = True
        
        p_name = tf_tech.paragraphs[0]
        p_name.text = name
        p_name.font.name = 'Arial'
        p_name.font.size = Pt(18)
        p_name.font.bold = True
        p_name.font.color.rgb = COLOR_SKY
        p_name.space_after = Pt(14)
        
        p_det = tf_tech.add_paragraph()
        p_det.text = details
        p_det.font.name = 'Arial'
        p_det.font.size = Pt(12)
        p_det.font.color.rgb = TEXT_MUTED
        
    add_footer(slide, 11)

    # ==========================================
    # SLIDE 12 - ROADMAP
    # ==========================================
    slide = prs.slides.add_slide(blank_layout)
    set_dark_background(slide)
    add_header(slide, "Roadmap de Evolução", "Cronograma de Lançamento")
    
    # 7 Columns represent phases
    phases = [
        ("Fase 1", "Gestão Oficina", "✓ Concluído"),
        ("Fase 2", "Gestão Frota", "✓ Concluído"),
        ("Fase 3", "Integração NF-e", "✓ Concluído"),
        ("Fase 4", "Inteligência Artif.", "✓ Concluído"),
        ("Fase 5", "Aplicativo Mobile", "Próximo"),
        ("Fase 6", "Marketplace", "Futuro"),
        ("Fase 7", "BI & Analytics", "Futuro")
    ]
    
    left_positions = [0.8, 2.5, 4.2, 5.9, 7.6, 9.3, 11.0]
    for i, (name, title, status) in enumerate(phases):
        bg = RGBColor(16, 27, 23) if "Concluído" in status else (RGBColor(16, 23, 40) if "Próximo" in status else COLOR_CARD_BG)
        draw_card(slide, Inches(left_positions[i]), Inches(2.3), Inches(1.533), Inches(3.8), bg)
        
        box = slide.shapes.add_textbox(Inches(left_positions[i] + 0.05), Inches(2.5), Inches(1.433), Inches(3.4))
        tf_p = box.text_frame
        tf_p.word_wrap = True
        
        p_n = tf_p.paragraphs[0]
        p_n.text = name
        p_n.font.name = 'Arial'
        p_n.font.size = Pt(16)
        p_n.font.bold = True
        p_n.font.color.rgb = TEXT_WHITE
        p_n.space_after = Pt(14)
        
        p_t = tf_p.add_paragraph()
        p_t.text = title
        p_t.font.name = 'Arial'
        p_t.font.size = Pt(12)
        p_t.font.bold = True
        p_t.font.color.rgb = COLOR_SKY
        p_t.space_after = Pt(18)
        
        p_s = tf_p.add_paragraph()
        p_s.text = status
        p_s.font.name = 'Arial'
        p_s.font.size = Pt(11)
        p_s.font.color.rgb = RGBColor(34, 197, 94) if "Concluído" in status else (COLOR_SKY if "Próximo" in status else TEXT_MUTED)
        
    add_footer(slide, 12)

    # ==========================================
    # SLIDE 13 - BENEFÍCIOS PARA O CLIENTE
    # ==========================================
    slide = prs.slides.add_slide(blank_layout)
    set_dark_background(slide)
    add_header(slide, "Benefícios para o Cliente", "Resultados Finais")
    
    # 4 Cards side by side
    benefits = [
        ("Redução de Custos", "Evita quebras inesperadas através de cronogramas rígidos de manutenção preventiva na frota."),
        ("Organização Geral", "Fluxo operacional padronizado desde a abertura da OS até o faturamento e envio de laudos."),
        ("Decisões com Dados", "Indicadores e relatórios consolidados em dashboards executivos em tempo real."),
        ("Produtividade Elevada", "Eliminação de controles em papéis e digitação manual por meio de automação e Inteligência Artificial.")
    ]
    
    left_positions = [0.8, 3.8, 6.8, 9.8]
    for i, (title, desc) in enumerate(benefits):
        draw_card(slide, Inches(left_positions[i]), Inches(2.2), Inches(2.733), Inches(3.9), COLOR_CARD_BG)
        box = slide.shapes.add_textbox(Inches(left_positions[i] + 0.1), Inches(2.4), Inches(2.533), Inches(3.5))
        tf_b = box.text_frame
        tf_b.word_wrap = True
        
        p_t = tf_b.paragraphs[0]
        p_t.text = title
        p_t.font.name = 'Arial'
        p_t.font.size = Pt(18)
        p_t.font.bold = True
        p_t.font.color.rgb = COLOR_SKY
        p_t.space_after = Pt(12)
        
        p_d = tf_b.add_paragraph()
        p_d.text = desc
        p_d.font.name = 'Arial'
        p_d.font.size = Pt(13)
        p_d.font.color.rgb = TEXT_MUTED
        
    add_footer(slide, 13)

    # ==========================================
    # SLIDE 14 - ENCERRAMENTO
    # ==========================================
    slide = prs.slides.add_slide(blank_layout)
    set_dark_background(slide)
    
    draw_card(slide, Inches(2.0), Inches(1.8), Inches(9.333), Inches(4.2), COLOR_CARD_BG)
    
    box = slide.shapes.add_textbox(Inches(2.3), Inches(2.0), Inches(8.733), Inches(3.8))
    tf = box.text_frame
    tf.word_wrap = True
    
    p_brand = tf.paragraphs[0]
    p_brand.text = "SUZANO IT"
    p_brand.alignment = PP_ALIGN.CENTER
    p_brand.font.name = 'Arial'
    p_brand.font.size = Pt(40)
    p_brand.font.bold = True
    p_brand.font.color.rgb = TEXT_WHITE
    p_brand.space_after = Pt(8)
    
    p_slog = tf.add_paragraph()
    p_slog.text = "Tecnologia Inteligente para Gestão de Oficinas e Frotas"
    p_slog.alignment = PP_ALIGN.CENTER
    p_slog.font.name = 'Arial'
    p_slog.font.size = Pt(16)
    p_slog.font.color.rgb = COLOR_SKY
    p_slog.space_after = Pt(28)
    
    p_contact = tf.add_paragraph()
    p_contact.text = "Website: www.suzanoit.com.br\nE-mail: contato@suzanoit.com.br"
    p_contact.alignment = PP_ALIGN.CENTER
    p_contact.font.name = 'Arial'
    p_contact.font.size = Pt(14)
    p_contact.font.color.rgb = TEXT_MUTED
    p_contact.space_after = Pt(28)
    
    p_quote = tf.add_paragraph()
    p_quote.text = '"Mais controle. Mais produtividade. Mais resultado."'
    p_quote.alignment = PP_ALIGN.CENTER
    p_quote.font.name = 'Arial'
    p_quote.font.size = Pt(16)
    p_quote.font.bold = True
    p_quote.font.color.rgb = COLOR_SKY
    
    add_footer(slide, 14)

    # Save presentation
    filename = "Apresentacao_Suzano_IT.pptx"
    prs.save(filename)
    print(f"Presentation saved successfully as {filename}")

if __name__ == "__main__":
    create_presentation()
