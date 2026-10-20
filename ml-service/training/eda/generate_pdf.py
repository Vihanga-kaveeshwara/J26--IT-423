"""
M2 Component: Refuse-Tea Prediction & System Integration
PDF Report Generation Script using ReportLab

Compiles the comprehensive EDA analysis, summary tables, and all 11 diagnostic
figures into a high-quality executive PDF report: eda_report.pdf
"""

import os
import sys
from PIL import Image as PILImage

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, PageBreak, HRFlowable
)

# ----------------------------------------------------------------------
# Paths
# ----------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FIGURES_DIR = os.path.join(SCRIPT_DIR, 'figures')
OUTPUT_PDF = os.path.join(SCRIPT_DIR, 'eda_report.pdf')

# ----------------------------------------------------------------------
# Two-Pass Canvas for Dynamic Page Numbering
# ----------------------------------------------------------------------
class NumberedCanvas(canvas.Canvas):
    """Canvas that enables two-pass rendering for accurate 'Page X of Y' footers."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont('Helvetica', 8)
        self.setFillColor(colors.HexColor('#495057'))

        # Running Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(40, 805, "M2: Refuse-Tea Prediction & System Integration | Exploratory Data Analysis")
            self.drawRightString(555, 805, "Sri Lankan Tea Export DSS")
            self.setStrokeColor(colors.HexColor('#ced4da'))
            self.setLineWidth(0.6)
            self.line(40, 798, 555, 798)

        # Running Footer (all pages)
        footer_y = 28
        self.drawString(40, footer_y, "CONFIDENTIAL - SYNTHETIC DATASET - PRE-MODELING AUDIT REPORT")
        self.drawRightString(555, footer_y, f"Page {self._pageNumber} of {page_count}")
        self.setStrokeColor(colors.HexColor('#ced4da'))
        self.setLineWidth(0.6)
        self.line(40, footer_y + 10, 555, footer_y + 10)

        self.restoreState()


# ----------------------------------------------------------------------
# Helper: Scaled ReportLab Image
# ----------------------------------------------------------------------
def get_scaled_image(img_path, max_w=500, max_h=300):
    if not os.path.exists(img_path):
        return Paragraph(f"<b>[Figure not found: {os.path.basename(img_path)}]</b>", getSampleStyleSheet()['Normal'])
    with PILImage.open(img_path) as pil_img:
        orig_w, orig_h = pil_img.size
    aspect = orig_h / orig_w
    target_w = min(max_w, 500)
    target_h = target_w * aspect
    if target_h > max_h:
        target_h = max_h
        target_w = target_h / aspect
    return Image(img_path, width=target_w, height=target_h)


# ----------------------------------------------------------------------
# PDF Builder
# ----------------------------------------------------------------------
def build_pdf():
    print(f"[INFO] Building executive PDF: {OUTPUT_PDF}")
    doc = SimpleDocTemplate(
        OUTPUT_PDF,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()

    # Custom Typography Palette
    primary_color = colors.HexColor('#1b4332')
    secondary_color = colors.HexColor('#2d6a4f')
    dark_neutral = colors.HexColor('#212529')
    muted_neutral = colors.HexColor('#495057')
    border_color = colors.HexColor('#ced4da')
    header_bg = colors.HexColor('#e8f5e9')
    table_alt_bg = colors.HexColor('#f8f9fa')
    caution_bg = colors.HexColor('#fff3cd')
    caution_border = colors.HexColor('#ffeeba')
    caution_text = colors.HexColor('#856404')
    leak_bg = colors.HexColor('#f8d7da')
    leak_border = colors.HexColor('#f5c6cb')
    leak_text = colors.HexColor('#721c24')

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color,
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=secondary_color,
        spaceAfter=12
    )
    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=muted_neutral
    )
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=secondary_color,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=dark_neutral,
        spaceAfter=6
    )
    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=14,
        bulletIndent=6,
        spaceAfter=3
    )
    caption_style = ParagraphStyle(
        'Caption_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=10.5,
        textColor=muted_neutral,
        alignment=1, # Center
        spaceBefore=4,
        spaceAfter=10
    )
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=dark_neutral
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold',
        textColor=primary_color
    )
    table_head_style = ParagraphStyle(
        'TableHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=primary_color,
        alignment=0
    )

    story = []

    # ------------------------------------------------------------------
    # Title & Metadata Banner
    # ------------------------------------------------------------------
    story.append(Paragraph("M2 Component: Refuse-Tea Prediction & System Integration", title_style))
    story.append(Paragraph("Exploratory Data Analysis (EDA) & Pre-Modeling Audit Report", subtitle_style))

    meta_text = (
        "<b>Project:</b> AI-Based Decision Support System for Sri Lankan Tea Export Operations &nbsp;|&nbsp; "
        "<b>Author:</b> Senior Data Science Team<br/>"
        "<b>Dataset:</b> M2_refuse_tea_synthetic_dataset.csv (620 Batches, 19 Columns) &nbsp;|&nbsp; "
        "<b>Date:</b> October 2026 &nbsp;|&nbsp; <b>Status:</b> Pre-Modeling EDA Complete"
    )
    story.append(Paragraph(meta_text, meta_style))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=2, spaceAfter=8))

    # ------------------------------------------------------------------
    # Synthetic Data Warning Box
    # ------------------------------------------------------------------
    disclaimer_html = (
        "<b>CRITICAL NOTICE — SYNTHETIC DATASET DISCLOSURE:</b><br/>"
        "The dataset analyzed in this report (620 batch-level records) is a <b>synthetic dataset</b> generated "
        "for development, system architecture validation, and machine learning pipeline testing prior to live factory "
        "telemetry collection. All quantitative findings, distributions, and empirical correlations reflect the generator's "
        "parameterized specifications and must <b>not</b> be cited as real empirical findings about Sri Lankan tea factories."
    )
    disc_p = Paragraph(disclaimer_html, ParagraphStyle('DiscP', parent=body_style, textColor=caution_text, fontSize=8, leading=11))
    disc_table = Table([[disc_p]], colWidths=[515])
    disc_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), caution_bg),
        ('BOX', (0,0), (-1,-1), 1, caution_border),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(disc_table)
    story.append(Spacer(1, 10))

    # ------------------------------------------------------------------
    # Executive Summary
    # ------------------------------------------------------------------
    story.append(Paragraph("Executive Summary & Core Directives", h1_style))
    exec_text = (
        "This report provides the pre-modeling exploratory data analysis for the M2 refuse-tea prediction component. "
        "The goal is to accurately predict the percentage of refuse tea generated per batch based on leaf characteristics, "
        "environmental variables, and factory processing parameters. Key insights include:"
    )
    story.append(Paragraph(exec_text, body_style))

    story.append(Paragraph("• <b>Elevated Target Distribution:</b> The target variable (<code>refuse_tea_pct</code>) averages <b>6.59%</b> (median: 6.38%, std: 1.52%, range: 3.29% to 14.25%), running +0.59% points above the 6.0% national industry baseline. A substantial <b>12.9% of batches exceed the 8.0% adverse loss threshold</b>, and 3.4% experience severe loss (>10.0%), confirming a pronounced right tail.", bullet_style))
    story.append(Paragraph("• <b>Hidden Non-Linear V-Shaped Curves:</b> Conventional linear correlation indicates near-zero signal for <code>withering_duration_hrs</code> (r = -0.028) and <code>dryer_temperature_c</code> (r = +0.025). However, binned non-linear analysis proves they follow distinct <b>U-shaped / V-shaped curves</b> with clear optimal operational windows (withering: 16.5–17.5 hrs; drying: 109–113 °C). Non-linear models like XGBoost are essential.", bullet_style))
    story.append(Paragraph("• <b>Mandatory Target Leakage Exclusion:</b> <code>made_tea_output_kg</code> and <code>refuse_tea_kg</code> are post-hoc scale weights mathematically derived from the target. Including either creates catastrophic 100% data leakage. <b>Both must be excluded in <code>preprocessing.py</code>.</b>", bullet_style))
    story.append(Paragraph("• <b>Multicollinearity & Post-Hoc Variables:</b> <code>region</code> and <code>elevation_band</code> have a 100% 1-to-1 bijection (Low-Country = LOW, Uva = MEDIUM, Nuwara Eliya = HIGH); <code>elevation_band</code> must be dropped. <code>refuse_resale_status</code> is a post-production classification and must be excluded from feature inputs.", bullet_style))
    story.append(Paragraph("• <b>High Data Quality:</b> Clean dataset with 0 missing values, 0 duplicate batch IDs, and realistic mass conservation (mean outturn ratio of 22.33%).", bullet_style))
    story.append(Spacer(1, 8))

    # ------------------------------------------------------------------
    # Section 1: Data Quality & Sanity Audit
    # ------------------------------------------------------------------
    story.append(Paragraph("1. Data Quality & Sanity Audit", h1_style))
    p1 = (
        "The dataset contains 620 batch records spanning two full calendar years (2024–2025) across 8 tea factories. "
        "Standard data hygiene checks confirm full structural integrity without missing values or duplicate identifiers."
    )
    story.append(Paragraph(p1, body_style))

    schema_data = [
        [Paragraph("Metric / Audit Check", table_head_style), Paragraph("Observed Value", table_head_style), Paragraph("Assessment & Preprocessing Directive", table_head_style)],
        [Paragraph("Dataset Dimensions", table_cell_bold), Paragraph("620 rows × 19 columns", table_cell_style), Paragraph("Sufficient sample size for 5-fold cross-validation.", table_cell_style)],
        [Paragraph("Missing Value Audit", table_cell_bold), Paragraph("0 missing across all 19 columns", table_cell_style), Paragraph("Complete dataset; zero imputation required.", table_cell_style)],
        [Paragraph("Primary Key Integrity", table_cell_bold), Paragraph("0 duplicates in batch_id (B0001–B0620)", table_cell_style), Paragraph("Unique index confirmed; drop batch_id before modeling.", table_cell_style)],
        [Paragraph("Mass Range Validation", table_cell_bold), Paragraph("Green leaf: 1,950–16,495 kg; Made: 418.5–3,415.4 kg", table_cell_style), Paragraph("Zero negative masses; physical consistency verified.", table_cell_style)],
        [Paragraph("Outturn Ratio Sanity", table_cell_bold), Paragraph("Mean: 22.33% (Min: 19.00%, Max: 25.63%)", table_cell_style), Paragraph("Precisely matches orthodox dry tea recovery norm (21%–23%).", table_cell_style)],
        [Paragraph("Target Boundary Sanity", table_cell_bold), Paragraph("Range: [3.29%, 14.25%]", table_cell_style), Paragraph("Fully within legitimate [0, 100] theoretical percentage bounds.", table_cell_style)]
    ]
    t_schema = Table(schema_data, colWidths=[120, 175, 220])
    t_schema.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), header_bg),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, table_alt_bg]),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_schema)
    story.append(Spacer(1, 10))

    # ------------------------------------------------------------------
    # Section 2: Target Variable Analysis (refuse_tea_pct)
    # ------------------------------------------------------------------
    story.append(Paragraph("2. Target Variable Analysis: refuse_tea_pct", h1_style))
    p2 = (
        "The target variable represents the percentage of total dry tea sorted out as unmarketable refuse (fibrous stalks, "
        "unfermented residue, fluff, and scorched particles). The sample distribution has a positive right skew (+1.14), "
        "meaning most batches achieve acceptable quality, while an adverse subset drives disproportionate yield losses."
    )
    story.append(Paragraph(p2, body_style))

    target_stats = [
        [Paragraph("Statistical Parameter", table_head_style), Paragraph("Observed Value", table_head_style), Paragraph("Industrial Benchmark / Interpretation", table_head_style)],
        [Paragraph("Mean / Std Dev", table_cell_bold), Paragraph("6.588% ± 1.525%", table_cell_style), Paragraph("+0.588% pts higher than the 6.00% Sri Lanka Tea Board baseline.", table_cell_style)],
        [Paragraph("Median / IQR", table_cell_bold), Paragraph("6.380% (IQR: 5.570% – 7.253%)", table_cell_style), Paragraph("50% of batches cluster tightly within a 1.68% percentage point band.", table_cell_style)],
        [Paragraph("Distribution Skewness", table_cell_bold), Paragraph("+1.140 (Kurtosis: +2.706)", table_cell_style), Paragraph("Right-skewed tail; high-waste events penalize standard RMSE.", table_cell_style)],
        [Paragraph("Batches > 6.0% (National Base)", table_cell_bold), Paragraph("413 batches (66.6%)", table_cell_style), Paragraph("Two-thirds of processed batches exceed ideal benchmark efficiency.", table_cell_style)],
        [Paragraph("Batches > 8.0% (Adverse Alert)", table_cell_bold), Paragraph("80 batches (12.9%)", table_cell_style), Paragraph("Severe profit margin erosion zone requiring proactive operator alerts.", table_cell_style)],
        [Paragraph("Batches > 10.0% (Critical Failure)", table_cell_bold), Paragraph("21 batches (3.4%)", table_cell_style), Paragraph("Peak at 14.25%; mechanical failure or extreme weather combinations.", table_cell_style)]
    ]
    t_target = Table(target_stats, colWidths=[130, 165, 220])
    t_target.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), header_bg),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, table_alt_bg]),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_target)
    story.append(Spacer(1, 8))

    story.append(get_scaled_image(os.path.join(FIGURES_DIR, 'fig01_target_distribution.png'), max_h=230))
    story.append(Paragraph("<b>Figure 1:</b> Empirical distribution of refuse_tea_pct with national baseline (6.0%) and adverse thresholds (>8%, >10%).", caption_style))
    story.append(Spacer(1, 10))

    # ------------------------------------------------------------------
    # Section 3: Univariate Analysis
    # ------------------------------------------------------------------
    story.append(PageBreak())
    story.append(Paragraph("3. Univariate Feature Distributions", h1_style))
    p3 = "Operational and ambient variables exhibit distinct distributions reflecting factory physics and tea agro-ecology."
    story.append(Paragraph(p3, body_style))

    u_data = [
        [Paragraph("Feature Name", table_head_style), Paragraph("Mean ± Std", table_head_style), Paragraph("Min – Max", table_head_style), Paragraph("Skew", table_head_style), Paragraph("Outliers", table_head_style), Paragraph("Operational Impact", table_head_style)],
        [Paragraph("green_leaf_input_kg", table_cell_bold), Paragraph("7,182 ± 2,739", table_cell_style), Paragraph("1,950 – 16,495", table_cell_style), Paragraph("+0.52", table_cell_style), Paragraph("2 (0.3%)", table_cell_style), Paragraph("Trough loading pressure during flush days.", table_cell_style)],
        [Paragraph("plucking_fine_leaf_pct", table_cell_bold), Paragraph("78.17 ± 6.81%", table_cell_style), Paragraph("56.2 – 96.0%", table_cell_style), Paragraph("-0.06", table_cell_style), Paragraph("6 (1.0%)", table_cell_style), Paragraph("Symmetric; coarser leaf introduces woody stalk.", table_cell_style)],
        [Paragraph("withering_duration_hrs", table_cell_bold), Paragraph("16.89 ± 2.27 h", table_cell_style), Paragraph("10.0 – 23.3 h", table_cell_style), Paragraph("-0.04", table_cell_style), Paragraph("10 (1.6%)", table_cell_style), Paragraph("Centered at standard trough residence (16.9 h).", table_cell_style)],
        [Paragraph("dryer_temperature_c", table_cell_bold), Paragraph("110.54 ± 6.91 °C", table_cell_style), Paragraph("94.5 – 134.2 °C", table_cell_style), Paragraph("+0.16", table_cell_style), Paragraph("3 (0.5%)", table_cell_style), Paragraph("Centered at standard firing temperature (110 °C).", table_cell_style)],
        [Paragraph("machine_downtime_hrs", table_cell_bold), Paragraph("0.64 ± 0.61 h", table_cell_style), Paragraph("0.0 – 4.39 h", table_cell_style), Paragraph("+1.73", table_cell_style), Paragraph("34 (5.5%)", table_cell_style), Paragraph("Heavy right skew; breakdowns cause leaf stewing.", table_cell_style)],
        [Paragraph("ambient_temperature_c", table_cell_bold), Paragraph("22.96 ± 4.48 °C", table_cell_style), Paragraph("11.9 – 31.8 °C", table_cell_style), Paragraph("-0.19", table_cell_style), Paragraph("0 (0.0%)", table_cell_style), Paragraph("Multi-modal spread reflecting elevation bands.", table_cell_style)],
        [Paragraph("relative_humidity_pct", table_cell_bold), Paragraph("77.33 ± 10.17%", table_cell_style), Paragraph("37.4 – 97.0%", table_cell_style), Paragraph("-0.89", table_cell_style), Paragraph("19 (3.1%)", table_cell_style), Paragraph("Left-skewed; low values in dry Uva season.", table_cell_style)]
    ]
    t_u = Table(u_data, colWidths=[95, 75, 75, 30, 45, 195])
    t_u.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), header_bg),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, table_alt_bg]),
        ('PADDING', (0,0), (-1,-1), 3.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_u)
    story.append(Spacer(1, 8))

    story.append(get_scaled_image(os.path.join(FIGURES_DIR, 'fig02_univariate_numeric_distributions.png'), max_h=225))
    story.append(Paragraph("<b>Figure 2:</b> Univariate histograms and kernel density estimates for operational manufacturing features.", caption_style))
    story.append(Spacer(1, 6))

    story.append(get_scaled_image(os.path.join(FIGURES_DIR, 'fig03_univariate_categorical_counts.png'), max_h=200))
    story.append(Paragraph("<b>Figure 3:</b> Distribution of categorical dimensions (Region, Elevation Band, Season, Grade, Resale, Factory).", caption_style))
    story.append(Spacer(1, 10))

    # ------------------------------------------------------------------
    # Section 4: Bivariate & Non-Linear Patterns
    # ------------------------------------------------------------------
    story.append(PageBreak())
    story.append(Paragraph("4. Bivariate Relationships & Non-Linear Patterns", h1_style))
    p4 = (
        "Linear Pearson correlation ($r$) and non-parametric Spearman rank correlation ($\rho$) reveal operational drivers. "
        "Critically, linear correlation fails to detect two of the most important process parameters due to V-shaped response curves."
    )
    story.append(Paragraph(p4, body_style))

    corr_data = [
        [Paragraph("Operational Feature", table_head_style), Paragraph("Pearson r", table_head_style), Paragraph("Spearman ρ", table_head_style), Paragraph("Curve Type", table_head_style), Paragraph("Underlying Industrial Mechanism", table_head_style)],
        [Paragraph("machine_downtime_hrs", table_cell_bold), Paragraph("+0.379", table_cell_style), Paragraph("+0.335", table_cell_style), Paragraph("Monotonic (+)", table_cell_style), Paragraph("Stoppages delay processing; rolled leaf ferments and stews.", table_cell_style)],
        [Paragraph("relative_humidity_pct", table_cell_bold), Paragraph("+0.246", table_cell_style), Paragraph("+0.330", table_cell_style), Paragraph("Monotonic (+)", table_cell_style), Paragraph("High ambient moisture impedes withering, leaving turgid stalks.", table_cell_style)],
        [Paragraph("plucking_fine_leaf_pct", table_cell_bold), Paragraph("-0.170", table_cell_style), Paragraph("-0.188", table_cell_style), Paragraph("Monotonic (-)", table_cell_style), Paragraph("Fine leaf yields tender shoots; coarse plucking adds woody fiber.", table_cell_style)],
        [Paragraph("dryer_temperature_c", table_cell_bold), Paragraph("<b>+0.025</b>", table_cell_style), Paragraph("<b>+0.025</b>", table_cell_style), Paragraph("<b>V-Shaped Curve</b>", table_cell_bold), Paragraph("<b>Optimum at 109–113 °C.</b> Under-drying causes stewing; over-drying scorches.", table_cell_style)],
        [Paragraph("withering_duration_hrs", table_cell_bold), Paragraph("<b>-0.028</b>", table_cell_style), Paragraph("<b>-0.036</b>", table_cell_style), Paragraph("<b>U-Shaped Curve</b>", table_cell_bold), Paragraph("<b>Optimum at 16.5–17.5 h.</b> Under-wither tears leaf; over-wither desiccates.", table_cell_style)]
    ]
    t_corr = Table(corr_data, colWidths=[105, 50, 55, 75, 230])
    t_corr.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), header_bg),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, table_alt_bg]),
        ('PADDING', (0,0), (-1,-1), 3.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_corr)
    story.append(Spacer(1, 8))

    story.append(get_scaled_image(os.path.join(FIGURES_DIR, 'fig07_nonlinear_v_shaped_relationships.png'), max_h=190))
    story.append(Paragraph("<b>Figure 4:</b> Binned mean refuse percentage displaying the U-shaped withering response and V-shaped dryer response.", caption_style))
    story.append(Spacer(1, 6))

    story.append(get_scaled_image(os.path.join(FIGURES_DIR, 'fig06_correlation_heatmap.png'), max_h=190))
    story.append(Paragraph("<b>Figure 5:</b> Pearson linear vs Spearman rank correlation heatmaps across all operational numerical features.", caption_style))
    story.append(Spacer(1, 6))

    story.append(get_scaled_image(os.path.join(FIGURES_DIR, 'fig05_categorical_boxplots.png'), max_h=180))
    story.append(Paragraph("<b>Figure 6:</b> Target distribution across Region, Elevation Band, Season, Grade Produced, and Resale Status.", caption_style))
    story.append(Spacer(1, 10))

    # ------------------------------------------------------------------
    # Section 5: Grouped & Multi-Factor Dynamics
    # ------------------------------------------------------------------
    story.append(PageBreak())
    story.append(Paragraph("5. Grouped & Multi-Factor Dynamics", h1_style))
    p5 = (
        "Multi-factor breakdown demonstrates that while factory location and elevation establish baseline performance, "
        "operational day-to-day conditions drive massive intra-factory variance."
    )
    story.append(Paragraph(p5, body_style))

    story.append(Paragraph("• <b>Between vs Within Factory Variance:</b> One-way ANOVA confirms factory differences are statistically significant (F = 6.08, p = 7.14e-07). Factory means range from 6.07% (Factory_B, Nuwara Eliya) to 7.34% (Factory_H, Low-Country). However, within-factory variation (std 1.1%–1.8%) is substantial, indicating that batch-level controls heavily influence refuse generation.", bullet_style))
    story.append(Paragraph("• <b>Uva Quality Season Anomaly:</b> During the South-West Monsoon (June–August), dry foehn (Cachan) winds cross into Uva, dropping mean relative humidity from 73.3% to 57.9% (-15.4% drop). Despite this atmospheric desiccation, refuse tea remains steady (6.29% vs 6.33%), demonstrating regional micro-climatic decoupling.", bullet_style))
    story.append(Spacer(1, 6))

    story.append(get_scaled_image(os.path.join(FIGURES_DIR, 'fig08_factory_variance_boxplot.png'), max_h=185))
    story.append(Paragraph("<b>Figure 7:</b> Factory-level boxplots ordered by mean refuse percentage with ANOVA statistical test.", caption_style))
    story.append(Spacer(1, 6))

    story.append(get_scaled_image(os.path.join(FIGURES_DIR, 'fig10_regional_humidity_relationships.png'), max_h=185))
    story.append(Paragraph("<b>Figure 8:</b> Agro-climatic humidity interactions highlighting the Uva dry season meteorological shift (Jun–Aug).", caption_style))
    story.append(Spacer(1, 6))

    story.append(get_scaled_image(os.path.join(FIGURES_DIR, 'fig09_monthly_temporal_trend.png'), max_h=180))
    story.append(Paragraph("<b>Figure 9:</b> 24-month timeline showing refuse spikes during May and September monsoon rainfall peaks.", caption_style))
    story.append(Spacer(1, 10))

    # ------------------------------------------------------------------
    # Section 6: Critical Target Leakage Audit
    # ------------------------------------------------------------------
    story.append(PageBreak())
    story.append(Paragraph("6. Critical Data Leakage Audit", h1_style))

    leak_html = (
        "<b>MANDATORY EXCLUSION DIRECTIVE FOR PREPROCESSING:</b><br/>"
        "<code>made_tea_output_kg</code> and <code>refuse_tea_kg</code> are mathematically derived post-hoc scale weights. "
        "Feeding either into the training matrix X creates 100% data leakage. "
        "<b>Both columns must be dropped in <code>preprocessing.py</code>.</b>"
    )
    leak_p = Paragraph(leak_html, ParagraphStyle('LeakP', parent=body_style, textColor=leak_text, fontSize=8, leading=11))
    leak_table = Table([[leak_p]], colWidths=[515])
    leak_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), leak_bg),
        ('BOX', (0,0), (-1,-1), 1, leak_border),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(leak_table)
    story.append(Spacer(1, 8))

    p6 = (
        "In factory accounting and in this synthetic generator, total output mass is the exact sum of made tea and refuse tea: "
        "<br/>&nbsp;&nbsp;&nbsp;&nbsp;<b>Total Output (kg) = made_tea_output_kg + refuse_tea_kg</b><br/>"
        "By definition, the target variable is computed algebraically from these end-of-process scale weights: "
        "<br/>&nbsp;&nbsp;&nbsp;&nbsp;<b>refuse_tea_pct = [refuse_tea_kg / (made_tea_output_kg + refuse_tea_kg)] × 100</b><br/>"
        "Reconstructing <code>refuse_tea_kg</code> algebraically against recorded mass yields a maximum error of only 0.0156 kg "
        "(strictly rounding noise), confirming an exact mathematical identity. Neither weight is known until 24–36 hours after "
        "manufacturing completes, making them unviable as operational predictive inputs."
    )
    story.append(Paragraph(p6, body_style))
    story.append(Spacer(1, 6))

    story.append(get_scaled_image(os.path.join(FIGURES_DIR, 'fig11_leakage_audit.png'), max_h=210))
    story.append(Paragraph("<b>Figure 10:</b> Algebraic proof of target reconstruction and 100% data leakage verification.", caption_style))
    story.append(Spacer(1, 10))

    # ------------------------------------------------------------------
    # Section 7: Feature Readiness & Preprocessing Recommendations
    # ------------------------------------------------------------------
    story.append(Paragraph("7. Feature Readiness & Preprocessing Checklist", h1_style))
    p7 = "The feature matrix for the upcoming preprocessing stage is structured as follows:"
    story.append(Paragraph(p7, body_style))

    feat_data = [
        [Paragraph("Feature Name", table_head_style), Paragraph("Role / Status", table_head_style), Paragraph("Signal Tier", table_head_style), Paragraph("Recommended Treatment in preprocessing.py", table_head_style)],
        [Paragraph("machine_downtime_hrs", table_cell_bold), Paragraph("Model Input", table_cell_style), Paragraph("Tier 1 (High)", table_cell_style), Paragraph("Log1p or RobustScaler to compress 5.5% heavy outlier tail.", table_cell_style)],
        [Paragraph("withering_duration_hrs", table_cell_bold), Paragraph("Model Input", table_cell_style), Paragraph("Tier 1 (High)", table_cell_style), Paragraph("Tree splitting or distance-from-optimum |x - 17.0|.", table_cell_style)],
        [Paragraph("dryer_temperature_c", table_cell_bold), Paragraph("Model Input", table_cell_style), Paragraph("Tier 1 (High)", table_cell_style), Paragraph("Tree splitting or distance-from-optimum |x - 110.0|.", table_cell_style)],
        [Paragraph("relative_humidity_pct", table_cell_bold), Paragraph("Model Input", table_cell_style), Paragraph("Tier 2 (Med)", table_cell_style), Paragraph("StandardScaler; interaction with region/month.", table_cell_style)],
        [Paragraph("plucking_fine_leaf_pct", table_cell_bold), Paragraph("Model Input", table_cell_style), Paragraph("Tier 2 (Med)", table_cell_style), Paragraph("StandardScaler; clean symmetric distribution.", table_cell_style)],
        [Paragraph("green_leaf_input_kg", table_cell_bold), Paragraph("Model Input", table_cell_style), Paragraph("Tier 2 (Med)", table_cell_style), Paragraph("RobustScaler; captures trough volume loading stress.", table_cell_style)],
        [Paragraph("ambient_temperature_c", table_cell_bold), Paragraph("Model Input", table_cell_style), Paragraph("Tier 2 (Med)", table_cell_style), Paragraph("StandardScaler; captures elevation temperature.", table_cell_style)],
        [Paragraph("region / season / grade", table_cell_bold), Paragraph("Model Input", table_cell_style), Paragraph("Tier 3 (Cat)", table_cell_style), Paragraph("One-Hot Encoding (drop_first=True).", table_cell_style)],
        [Paragraph("elevation_band", table_cell_bold), Paragraph("EXCLUDED", table_cell_bold), Paragraph("Redundant", table_cell_style), Paragraph("Drop; 100% collinear with region (Low=LOW, Uva=MED, Nuwara=HIGH).", table_cell_style)],
        [Paragraph("made_tea_output_kg", table_cell_bold), Paragraph("EXCLUDED", table_cell_bold), Paragraph("Leakage", table_cell_style), Paragraph("Drop; post-hoc accounting mass causing 100% target leakage.", table_cell_style)],
        [Paragraph("refuse_tea_kg", table_cell_bold), Paragraph("EXCLUDED", table_cell_bold), Paragraph("Leakage", table_cell_style), Paragraph("Drop; post-hoc accounting mass causing 100% target leakage.", table_cell_style)],
        [Paragraph("refuse_resale_status", table_cell_bold), Paragraph("EXCLUDED", table_cell_bold), Paragraph("Post-Hoc", table_cell_style), Paragraph("Drop from X; retain for post-prediction revenue impact.", table_cell_style)],
        [Paragraph("batch_id / batch_date", table_cell_bold), Paragraph("EXCLUDED", table_cell_bold), Paragraph("Metadata", table_cell_style), Paragraph("Drop batch_id; parse batch_date into month and season.", table_cell_style)]
    ]
    t_feat = Table(feat_data, colWidths=[110, 65, 60, 280])
    t_feat.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), header_bg),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, table_alt_bg]),
        ('PADDING', (0,0), (-1,-1), 3),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_feat)
    story.append(Spacer(1, 14))

    signoff_p = Paragraph("<b>Report Approved:</b> Senior Data Science Team &nbsp;|&nbsp; <b>Next Milestone:</b> ml-service/training/preprocessing.py implementation", meta_style)
    story.append(signoff_p)

    # Build the document using the NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] Executive PDF report created successfully at: {OUTPUT_PDF}")


if __name__ == '__main__':
    build_pdf()
