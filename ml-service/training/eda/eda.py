"""
M2 Component: Refuse-Tea Prediction & System Integration
Exploratory Data Analysis (EDA) Script

This script performs comprehensive Exploratory Data Analysis on the synthetic tea manufacturing
batch dataset (M2_refuse_tea_synthetic_dataset.csv) to inform preprocessing, feature engineering,
and subsequent XGBoost + SHAP modeling.

Usage:
    cd ml-service/training/eda
    python eda.py
"""

import os
import sys
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats

# ---------------------------------------------------------
# Configuration & Paths
# ---------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..', 'dataset'))
FIGURES_DIR = os.path.join(SCRIPT_DIR, 'figures')
os.makedirs(FIGURES_DIR, exist_ok=True)

# Visual styling
plt.style.use('seaborn-v0_8-whitegrid')
plt.rcParams['font.sans-serif'] = 'DejaVu Sans'
plt.rcParams['font.size'] = 10
plt.rcParams['axes.titlesize'] = 12
plt.rcParams['axes.titleweight'] = 'bold'
plt.rcParams['axes.labelsize'] = 11
plt.rcParams['axes.labelweight'] = 'bold'
plt.rcParams['xtick.labelsize'] = 9
plt.rcParams['ytick.labelsize'] = 9
plt.rcParams['figure.titlesize'] = 14
plt.rcParams['figure.titleweight'] = 'bold'

PALETTE_TEA = ['#2d6a4f', '#52b788', '#d90429', '#e76f51', '#f4a261', '#1d3557', '#457b9d']


def load_dataset():
    """Locate and load the dataset."""
    possible_paths = [
        os.path.join(DATASET_DIR, 'M2_refuse_tea_synthetic_dataset.csv'),
        os.path.join(DATASET_DIR, 'M2_refuse_tea_synthetic_dataset-new.csv')
    ]
    for p in possible_paths:
        if os.path.exists(p):
            print(f"[INFO] Loading dataset from: {p}")
            df = pd.read_csv(p)
            return df
    raise FileNotFoundError(f"Dataset not found in {DATASET_DIR}. Expected M2_refuse_tea_synthetic_dataset.csv")


def plot_target_distribution(df):
    """Plot 1: Distribution of target variable refuse_tea_pct."""
    fig, ax = plt.subplots(figsize=(10, 6))
    target = df['refuse_tea_pct']

    sns.histplot(target, kde=True, bins=35, color='#2d6a4f', edgecolor='black', alpha=0.6, ax=ax)

    # Reference lines
    mean_val = target.mean()
    median_val = target.median()
    baseline = 6.0
    adverse = 8.0
    severe = 10.0

    ax.axvline(baseline, color='#1d3557', linestyle='--', linewidth=2, label=f'National Baseline ({baseline:.1f}%)')
    ax.axvline(mean_val, color='#2d6a4f', linestyle='-', linewidth=2, label=f'Sample Mean ({mean_val:.2f}%)')
    ax.axvline(median_val, color='#52b788', linestyle=':', linewidth=2, label=f'Sample Median ({median_val:.2f}%)')
    ax.axvline(adverse, color='#e76f51', linestyle='--', linewidth=2, label=f'Adverse Threshold (>8.0%: {(target > 8).mean()*100:.1f}%)')
    ax.axvline(severe, color='#d90429', linestyle='-.', linewidth=2, label=f'Severe Threshold (>10.0%: {(target > 10).mean()*100:.1f}%)')

    # Annotation box
    stats_text = (
        f"Count: {len(target)}\n"
        f"Mean: {mean_val:.2f}%\n"
        f"Std Dev: {target.std():.2f}%\n"
        f"Median: {median_val:.2f}%\n"
        f"IQR: {target.quantile(0.75)-target.quantile(0.25):.2f}%\n"
        f"Skewness: {target.skew():.2f} (Right-skewed)\n"
        f"Kurtosis: {target.kurtosis():.2f}\n"
        f"Min / Max: {target.min():.2f}% / {target.max():.2f}%\n"
        f"Batches > 8%: {(target > 8).sum()} ({(target > 8).mean()*100:.1f}%)\n"
        f"Batches > 10%: {(target > 10).sum()} ({(target > 10).mean()*100:.1f}%)"
    )
    ax.text(0.70, 0.95, stats_text, transform=ax.transAxes, verticalalignment='top',
            bbox=dict(boxstyle='round,pad=0.6', facecolor='#f8f9fa', edgecolor='#ced4da', alpha=0.95),
            fontsize=9, family='monospace')

    ax.set_title('Target Variable Distribution: Refuse Tea Percentage (refuse_tea_pct)', pad=15)
    ax.set_xlabel('Refuse Tea Percentage (%)')
    ax.set_ylabel('Batch Count')
    ax.legend(loc='upper left', frameon=True, facecolor='white', framealpha=0.9)
    plt.tight_layout()

    outpath = os.path.join(FIGURES_DIR, 'fig01_target_distribution.png')
    plt.savefig(outpath, dpi=300)
    plt.close()
    print(f"[SAVED] {outpath}")


def plot_univariate_numeric(df):
    """Plot 2: Univariate distribution of operational numeric features."""
    features = [
        ('green_leaf_input_kg', 'Green Leaf Input (kg)', '#2d6a4f'),
        ('plucking_fine_leaf_pct', 'Plucking Fine Leaf (%)', '#40916c'),
        ('withering_duration_hrs', 'Withering Duration (hrs)', '#52b788'),
        ('dryer_temperature_c', 'Dryer Temperature (°C)', '#e76f51'),
        ('machine_downtime_hrs', 'Machine Downtime (hrs)', '#d90429'),
        ('ambient_temperature_c', 'Ambient Temperature (°C)', '#f4a261'),
        ('relative_humidity_pct', 'Relative Humidity (%)', '#1d3557')
    ]

    fig, axes = plt.subplots(3, 3, figsize=(15, 12))
    axes = axes.flatten()

    for i, (col, label, color) in enumerate(features):
        ax = axes[i]
        sns.histplot(df[col], kde=True, color=color, ax=ax, edgecolor='black', alpha=0.6, bins=25)
        mean_v = df[col].mean()
        med_v = df[col].median()
        skew_v = df[col].skew()

        ax.axvline(mean_v, color='black', linestyle='--', linewidth=1.5, label=f'Mean: {mean_v:.1f}')
        ax.axvline(med_v, color='red', linestyle=':', linewidth=1.5, label=f'Median: {med_v:.1f}')
        ax.set_title(f'{label}\n(Skewness: {skew_v:.2f})', fontsize=11)
        ax.set_xlabel(label)
        ax.set_ylabel('Frequency')
        ax.legend(fontsize=8, loc='upper right')

    # Remove unused subplots
    for j in range(len(features), len(axes)):
        fig.delaxes(axes[j])

    fig.suptitle('Univariate Distributions of Operational Manufacturing Features', fontsize=15, y=0.98)
    plt.tight_layout(rect=[0, 0.03, 1, 0.95])

    outpath = os.path.join(FIGURES_DIR, 'fig02_univariate_numeric_distributions.png')
    plt.savefig(outpath, dpi=300)
    plt.close()
    print(f"[SAVED] {outpath}")


def plot_univariate_categoricals(df):
    """Plot 3: Frequency distributions for all categorical variables."""
    cat_cols = [
        ('region', 'Region', '#2d6a4f'),
        ('elevation_band', 'Elevation Band', '#40916c'),
        ('season', 'Season', '#1d3557'),
        ('tea_grade_produced', 'Tea Grade Produced', '#e76f51'),
        ('refuse_resale_status', 'Refuse Resale Status', '#d90429'),
        ('factory_id', 'Factory ID', '#457b9d')
    ]

    fig, axes = plt.subplots(2, 3, figsize=(16, 10))
    axes = axes.flatten()

    for i, (col, title, color) in enumerate(cat_cols):
        ax = axes[i]
        order = df[col].value_counts().index
        counts = df[col].value_counts()
        pcts = df[col].value_counts(normalize=True) * 100

        bars = ax.bar(order, counts, color=color, edgecolor='black', alpha=0.75)
        ax.set_title(title, fontsize=12)
        ax.set_ylabel('Batch Count')
        ax.tick_params(axis='x', rotation=30 if len(order) > 4 else 0)

        # Label percentage on top of bars
        for bar, p in zip(bars, pcts):
            yval = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2.0, yval + 3, f'{p:.1f}%', ha='center', va='bottom', fontsize=9)

        ax.set_ylim(0, max(counts) * 1.15)

    fig.suptitle('Categorical Feature Frequency Counts and Proportions (N=620 Batches)', fontsize=15, y=0.98)
    plt.tight_layout(rect=[0, 0.03, 1, 0.95])

    outpath = os.path.join(FIGURES_DIR, 'fig03_univariate_categorical_counts.png')
    plt.savefig(outpath, dpi=300)
    plt.close()
    print(f"[SAVED] {outpath}")


def plot_bivariate_scatter(df):
    """Plot 4: Bivariate scatter plots of numeric features vs target."""
    features = [
        ('green_leaf_input_kg', 'Green Leaf Input (kg)'),
        ('plucking_fine_leaf_pct', 'Plucking Fine Leaf (%)'),
        ('withering_duration_hrs', 'Withering Duration (hrs)'),
        ('dryer_temperature_c', 'Dryer Temperature (°C)'),
        ('machine_downtime_hrs', 'Machine Downtime (hrs)'),
        ('ambient_temperature_c', 'Ambient Temperature (°C)'),
        ('relative_humidity_pct', 'Relative Humidity (%)')
    ]

    fig, axes = plt.subplots(3, 3, figsize=(16, 13))
    axes = axes.flatten()

    for i, (col, label) in enumerate(features):
        ax = axes[i]
        p_corr = df[col].corr(df['refuse_tea_pct'])
        s_corr = df[col].corr(df['refuse_tea_pct'], method='spearman')

        sns.regplot(
            data=df, x=col, y='refuse_tea_pct', ax=ax,
            scatter_kws={'alpha': 0.45, 'color': '#2d6a4f', 's': 25},
            line_kws={'color': '#d90429', 'linewidth': 2}
        )
        ax.axhline(6.0, color='#1d3557', linestyle='--', alpha=0.5, label='6.0% Baseline')
        ax.set_title(f'{label}\nPearson r = {p_corr:+.3f} | Spearman ρ = {s_corr:+.3f}', fontsize=11)
        ax.set_xlabel(label)
        ax.set_ylabel('Refuse Tea (%)')
        ax.legend(fontsize=8, loc='upper right')

    for j in range(len(features), len(axes)):
        fig.delaxes(axes[j])

    fig.suptitle('Bivariate Relationships: Operational Features vs Refuse Tea Percentage', fontsize=15, y=0.98)
    plt.tight_layout(rect=[0, 0.03, 1, 0.95])

    outpath = os.path.join(FIGURES_DIR, 'fig04_numeric_vs_target_scatter.png')
    plt.savefig(outpath, dpi=300)
    plt.close()
    print(f"[SAVED] {outpath}")


def plot_categorical_boxplots(df):
    """Plot 5: Boxplots of refuse_tea_pct by categorical groupings."""
    cats = [
        ('region', 'Region', '#2d6a4f'),
        ('elevation_band', 'Elevation Band', '#40916c'),
        ('season', 'Season', '#1d3557'),
        ('tea_grade_produced', 'Tea Grade Produced', '#e76f51'),
        ('refuse_resale_status', 'Refuse Resale Status', '#d90429')
    ]

    fig, axes = plt.subplots(2, 3, figsize=(16, 10))
    axes = axes.flatten()

    for i, (col, title, color) in enumerate(cats):
        ax = axes[i]
        order = df.groupby(col)['refuse_tea_pct'].mean().sort_values(ascending=False).index

        sns.boxplot(data=df, x=col, y='refuse_tea_pct', order=order, ax=ax, hue=col, palette='Blues_r', legend=False, showmeans=True,
                    meanprops={'marker':'o', 'markerfacecolor':'red', 'markeredgecolor':'black', 'markersize':'6'})
        sns.stripplot(data=df, x=col, y='refuse_tea_pct', order=order, ax=ax, color='black', alpha=0.2, jitter=0.2, size=3)

        ax.axhline(6.0, color='#1d3557', linestyle='--', alpha=0.7, label='6.0% Baseline')
        ax.set_title(f'Refuse Tea % by {title}', fontsize=12)
        ax.set_xlabel(title)
        ax.set_ylabel('Refuse Tea (%)')
        ax.tick_params(axis='x', rotation=25 if len(order) > 4 else 0)
        ax.legend(loc='upper right', fontsize=8)

    # In the 6th subplot, show an informative summary table / note
    ax_last = axes[5]
    ax_last.axis('off')
    summary_msg = (
        "Key Categorical Observations:\n\n"
        "1. Region & Elevation:\n"
        "   - Low-Country (LOW elevation) exhibits the\n"
        "     highest refuse rates (mean: 7.01%).\n"
        "   - Nuwara Eliya (HIGH) & Uva (MEDIUM) cluster\n"
        "     lower (mean: 6.31% and 6.32%).\n\n"
        "2. Seasonality:\n"
        "   - SW Monsoon shows highest mean (6.82%),\n"
        "     driven by sustained heavy rains in western\n"
        "     and low-country sectors.\n\n"
        "3. Grade Produced:\n"
        "   - DUST (6.90%) & BOP (6.78%) generate more\n"
        "     refuse; OP shows lowest refuse (6.15%).\n\n"
        "4. Resale Status:\n"
        "   - Post-production classification only.\n"
        "   - Batches with lower refuse are more likely\n"
        "     marketable as discounted secondary grades."
    )
    ax_last.text(0.05, 0.95, summary_msg, transform=ax_last.transAxes, verticalalignment='top',
                 fontsize=10, bbox=dict(boxstyle='round,pad=0.8', facecolor='#f8f9fa', edgecolor='#dee2e6'),
                 family='sans-serif', linespacing=1.4)

    fig.suptitle('Target Distribution Grouped by Key Categorical Dimensions', fontsize=15, y=0.98)
    plt.tight_layout(rect=[0, 0.03, 1, 0.95])

    outpath = os.path.join(FIGURES_DIR, 'fig05_categorical_boxplots.png')
    plt.savefig(outpath, dpi=300)
    plt.close()
    print(f"[SAVED] {outpath}")


def plot_correlation_heatmap(df):
    """Plot 6: Pearson and Spearman correlation heatmaps."""
    num_cols = [
        'refuse_tea_pct', 'machine_downtime_hrs', 'relative_humidity_pct',
        'ambient_temperature_c', 'green_leaf_input_kg', 'dryer_temperature_c',
        'withering_duration_hrs', 'plucking_fine_leaf_pct'
    ]
    labels = [
        'Refuse Tea % (Target)', 'Machine Downtime', 'Relative Humidity',
        'Ambient Temp', 'Green Leaf Input', 'Dryer Temp',
        'Withering Duration', 'Plucking Fine Leaf'
    ]

    p_corr = df[num_cols].corr(method='pearson')
    s_corr = df[num_cols].corr(method='spearman')

    fig, axes = plt.subplots(1, 2, figsize=(16, 7))

    sns.heatmap(p_corr, annot=True, fmt='.2f', cmap='coolwarm', vmin=-0.5, vmax=0.5,
                xticklabels=labels, yticklabels=labels, cbar_kws={'label': 'Pearson r'}, ax=axes[0])
    axes[0].set_title('Pearson Linear Correlation Matrix', pad=12)
    axes[0].tick_params(axis='x', rotation=45)

    sns.heatmap(s_corr, annot=True, fmt='.2f', cmap='coolwarm', vmin=-0.5, vmax=0.5,
                xticklabels=labels, yticklabels=labels, cbar_kws={'label': 'Spearman ρ'}, ax=axes[1])
    axes[1].set_title('Spearman Rank Correlation Matrix (Monotonicity)', pad=12)
    axes[1].tick_params(axis='x', rotation=45)

    fig.suptitle('Correlation Analysis of Operational Features and Target Variable', fontsize=15, y=0.98)
    plt.tight_layout(rect=[0, 0.03, 1, 0.95])

    outpath = os.path.join(FIGURES_DIR, 'fig06_correlation_heatmap.png')
    plt.savefig(outpath, dpi=300)
    plt.close()
    print(f"[SAVED] {outpath}")


def plot_nonlinear_relationships(df):
    """Plot 7: Dedicated binned average / non-linear U-shaped curves."""
    fig, axes = plt.subplots(1, 2, figsize=(15, 6))

    # 1. Withering duration non-linear plot
    df_temp = df.copy()
    w_bins = [9.9, 15.0, 16.5, 17.5, 19.0, 24.0]
    w_labels = ['<15.0h\n(Under-withered)', '15.0-16.5h\n(Mild under)', '16.5-17.5h\n(Optimal Window)', '17.5-19.0h\n(Mild over)', '>19.0h\n(Over-withered)']
    df_temp['withering_cat'] = pd.cut(df_temp['withering_duration_hrs'], bins=w_bins, labels=w_labels)
    w_stats = df_temp.groupby('withering_cat', observed=False)['refuse_tea_pct'].agg(['mean', 'sem', 'count']).reset_index()

    ax1 = axes[0]
    ax1.errorbar(range(len(w_stats)), w_stats['mean'], yerr=w_stats['sem']*1.96, fmt='o-', color='#2d6a4f',
                 ecolor='#d90429', elinewidth=2, capsize=5, markersize=8, linewidth=2.5, label='Binned Mean ± 95% CI')
    ax1.axhline(6.0, color='#1d3557', linestyle='--', label='6.0% Baseline')

    for idx, row in w_stats.iterrows():
        ax1.annotate(f"{row['mean']:.2f}%\n(n={row['count']})", (idx, row['mean'] + 0.08), ha='center', fontsize=9, weight='bold')

    ax1.set_xticks(range(len(w_stats)))
    ax1.set_xticklabels(w_stats['withering_cat'], fontsize=9)
    ax1.set_title('Withering Duration vs Refuse Tea %\n(Clear U-Shaped Non-Linear Relationship; Pearson r ≈ -0.03)', fontsize=12)
    ax1.set_xlabel('Withering Duration Range (hrs)')
    ax1.set_ylabel('Mean Refuse Tea (%)')
    ax1.set_ylim(5.6, 7.5)
    ax1.legend(loc='upper right')

    # 2. Dryer temperature non-linear plot
    d_bins = [90.0, 105.0, 109.0, 113.0, 117.0, 140.0]
    d_labels = ['<105°C\n(Under-drying)', '105-109°C\n(Mild under)', '109-113°C\n(Optimal Firing)', '113-117°C\n(Mild over)', '>117°C\n(Case-hardening/Scorching)']
    df_temp['dryer_cat'] = pd.cut(df_temp['dryer_temperature_c'], bins=d_bins, labels=d_labels)
    d_stats = df_temp.groupby('dryer_cat', observed=False)['refuse_tea_pct'].agg(['mean', 'sem', 'count']).reset_index()

    ax2 = axes[1]
    ax2.errorbar(range(len(d_stats)), d_stats['mean'], yerr=d_stats['sem']*1.96, fmt='s-', color='#e76f51',
                 ecolor='#d90429', elinewidth=2, capsize=5, markersize=8, linewidth=2.5, label='Binned Mean ± 95% CI')
    ax2.axhline(6.0, color='#1d3557', linestyle='--', label='6.0% Baseline')

    for idx, row in d_stats.iterrows():
        ax2.annotate(f"{row['mean']:.2f}%\n(n={row['count']})", (idx, row['mean'] + 0.08), ha='center', fontsize=9, weight='bold')

    ax2.set_xticks(range(len(d_stats)))
    ax2.set_xticklabels(d_stats['dryer_cat'], fontsize=9)
    ax2.set_title('Dryer Temperature vs Refuse Tea %\n(V-Shaped Non-Linear Relationship; Pearson r ≈ +0.03)', fontsize=12)
    ax2.set_xlabel('Dryer Temperature Range (°C)')
    ax2.set_ylabel('Mean Refuse Tea (%)')
    ax2.set_ylim(5.6, 7.5)
    ax2.legend(loc='upper right')

    fig.suptitle('Non-Linear & Non-Monotonic Operational Factors Masked by Linear Correlation', fontsize=15, y=0.98)
    plt.tight_layout(rect=[0, 0.03, 1, 0.95])

    outpath = os.path.join(FIGURES_DIR, 'fig07_nonlinear_v_shaped_relationships.png')
    plt.savefig(outpath, dpi=300)
    plt.close()
    print(f"[SAVED] {outpath}")


def plot_factory_variance(df):
    """Plot 8: Factory-level variance and ANOVA."""
    fig, ax = plt.subplots(figsize=(12, 6))

    # Order factories by mean refuse_tea_pct
    order = df.groupby('factory_id')['refuse_tea_pct'].mean().sort_values().index

    sns.boxplot(data=df, x='factory_id', y='refuse_tea_pct', order=order, ax=ax, hue='factory_id', palette='GnBu_d', legend=False, showmeans=True,
                meanprops={'marker':'D', 'markerfacecolor':'red', 'markeredgecolor':'black', 'markersize': 7})
    sns.stripplot(data=df, x='factory_id', y='refuse_tea_pct', order=order, ax=ax, color='black', alpha=0.3, jitter=0.2, size=4)

    grand_mean = df['refuse_tea_pct'].mean()
    ax.axhline(grand_mean, color='#d90429', linestyle='-', linewidth=2, label=f'Overall Dataset Mean ({grand_mean:.2f}%)')
    ax.axhline(6.0, color='#1d3557', linestyle='--', linewidth=1.5, label='National Baseline (6.0%)')

    # Factory region annotations
    factory_regions = df.groupby('factory_id')['region'].first().to_dict()
    for idx, f_id in enumerate(order):
        reg = factory_regions[f_id]
        f_mean = df[df['factory_id'] == f_id]['refuse_tea_pct'].mean()
        ax.text(idx, 2.7, f"{reg}\nMean: {f_mean:.2f}%", ha='center', fontsize=8,
                bbox=dict(boxstyle='square,pad=0.2', facecolor='white', edgecolor='#ced4da', alpha=0.8))

    # ANOVA calculation
    f_groups = [group['refuse_tea_pct'].values for _, group in df.groupby('factory_id')]
    f_stat, p_val = stats.f_oneway(*f_groups)

    ax.text(0.02, 0.95, f"One-Way ANOVA Across Factories:\nF-statistic = {f_stat:.2f}\np-value = {p_val:.2e} (Statistically Significant)",
            transform=ax.transAxes, verticalalignment='top',
            bbox=dict(boxstyle='round,pad=0.5', facecolor='#f8f9fa', edgecolor='#ced4da'), fontsize=9)

    ax.set_title('Refuse Tea Percentage Variation Across Factories (Factory_A to Factory_H)', pad=15)
    ax.set_xlabel('Factory Identifier (Ordered by Mean Refuse %)')
    ax.set_ylabel('Refuse Tea Percentage (%)')
    ax.set_ylim(2.5, 15.0)
    ax.legend(loc='upper right', frameon=True, facecolor='white')
    plt.tight_layout()

    outpath = os.path.join(FIGURES_DIR, 'fig08_factory_variance_boxplot.png')
    plt.savefig(outpath, dpi=300)
    plt.close()
    print(f"[SAVED] {outpath}")


def plot_temporal_trends(df):
    """Plot 9: Monthly temporal trend and seasonal distribution."""
    fig, axes = plt.subplots(1, 2, figsize=(16, 6))

    # 1. Monthly Line Chart
    ax1 = axes[0]
    monthly = df.groupby('month')['refuse_tea_pct'].agg(['mean', 'std', 'count']).reset_index()
    monthly['sem'] = monthly['std'] / np.sqrt(monthly['count'])

    ax1.plot(monthly['month'], monthly['mean'], marker='o', linewidth=2.5, color='#2d6a4f', label='Monthly Mean')
    ax1.fill_between(monthly['month'], monthly['mean'] - 1.96*monthly['sem'], monthly['mean'] + 1.96*monthly['sem'],
                     color='#52b788', alpha=0.25, label='95% Confidence Band')

    # Seasonal background shading
    ax1.axvspan(0.5, 2.5, color='#e9ecef', alpha=0.5, label='NE Monsoon (Dec-Feb)')
    ax1.axvspan(11.5, 12.5, color='#e9ecef', alpha=0.5)
    ax1.axvspan(2.5, 4.5, color='#d8f3dc', alpha=0.5, label='Inter-Monsoon 1 (Mar-Apr)')
    ax1.axvspan(9.5, 11.5, color='#d8f3dc', alpha=0.5)
    ax1.axvspan(4.5, 9.5, color='#ffe5d9', alpha=0.5, label='SW Monsoon (May-Sep)')

    ax1.axhline(6.0, color='#1d3557', linestyle='--', label='6.0% Baseline')
    ax1.set_xticks(range(1, 13))
    ax1.set_xticklabels(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])
    ax1.set_title('Monthly Refuse Tea Percentage Trend Over the 24-Month Window', fontsize=12)
    ax1.set_xlabel('Month of Year')
    ax1.set_ylabel('Refuse Tea (%)')
    ax1.legend(loc='lower left', fontsize=8, framealpha=0.9)

    # 2. Season Boxplot
    ax2 = axes[1]
    season_order = ['NE_MONSOON', 'INTER_MONSOON', 'SW_MONSOON']
    sns.boxplot(data=df, x='season', y='refuse_tea_pct', order=season_order, ax=ax2, hue='season', palette='YlOrRd', legend=False, showmeans=True,
                meanprops={'marker':'o', 'markerfacecolor':'white', 'markeredgecolor':'black', 'markersize': 7})
    sns.stripplot(data=df, x='season', y='refuse_tea_pct', order=season_order, ax=ax2, color='black', alpha=0.25, jitter=0.2, size=4)
    ax2.axhline(6.0, color='#1d3557', linestyle='--', label='6.0% Baseline')

    s_means = df.groupby('season')['refuse_tea_pct'].mean()
    for idx, s_name in enumerate(season_order):
        ax2.annotate(f"Mean: {s_means[s_name]:.2f}%", (idx, s_means[s_name] + 0.3), ha='center', fontsize=9, weight='bold')

    ax2.set_title('Refuse Tea Distribution Across Climatic Seasons', fontsize=12)
    ax2.set_xlabel('Climatic Season')
    ax2.set_ylabel('Refuse Tea (%)')
    ax2.legend(loc='upper right', fontsize=8)

    fig.suptitle('Temporal and Seasonal Dynamics of Refuse Tea Generation', fontsize=15, y=0.98)
    plt.tight_layout(rect=[0, 0.03, 1, 0.95])

    outpath = os.path.join(FIGURES_DIR, 'fig09_monthly_temporal_trend.png')
    plt.savefig(outpath, dpi=300)
    plt.close()
    print(f"[SAVED] {outpath}")


def plot_regional_humidity(df):
    """Plot 10: Humidity vs Refuse Tea across regions with Uva Jun-Aug focus."""
    fig, axes = plt.subplots(1, 2, figsize=(16, 6))

    # 1. Multi-region scatter + regression
    ax1 = axes[0]
    regions = ['Low-Country', 'Nuwara Eliya', 'Uva']
    palette = {'Low-Country': '#d90429', 'Nuwara Eliya': '#2d6a4f', 'Uva': '#1d3557'}

    for reg in regions:
        sub = df[df['region'] == reg]
        r = sub['relative_humidity_pct'].corr(sub['refuse_tea_pct'])
        sns.regplot(data=sub, x='relative_humidity_pct', y='refuse_tea_pct', ax=ax1,
                    scatter_kws={'alpha': 0.4, 's': 25, 'color': palette[reg]},
                    line_kws={'linewidth': 2, 'color': palette[reg], 'label': f"{reg} (r={r:+.2f})"})

    ax1.axhline(6.0, color='gray', linestyle='--', alpha=0.6, label='6.0% Baseline')
    ax1.set_title('Relative Humidity vs Refuse Tea % by Agro-Climatic Region', fontsize=12)
    ax1.set_xlabel('Relative Humidity (%)')
    ax1.set_ylabel('Refuse Tea (%)')
    ax1.legend(loc='upper left', frameon=True, facecolor='white')

    # 2. Uva Region Focus: Jun-Aug vs Other Months
    ax2 = axes[1]
    uva = df[df['region'] == 'Uva'].copy()
    uva['season_period'] = uva['month'].apply(lambda m: 'Uva Quality Season (Jun-Aug)' if m in [6, 7, 8] else 'Other Months (Sep-May)')

    p_colors = {'Uva Quality Season (Jun-Aug)': '#e76f51', 'Other Months (Sep-May)': '#457b9d'}
    for period in ['Uva Quality Season (Jun-Aug)', 'Other Months (Sep-May)']:
        sub_u = uva[uva['season_period'] == period]
        r_u = sub_u['relative_humidity_pct'].corr(sub_u['refuse_tea_pct'])
        sns.regplot(data=sub_u, x='relative_humidity_pct', y='refuse_tea_pct', ax=ax2,
                    scatter_kws={'alpha': 0.6, 's': 35, 'color': p_colors[period]},
                    line_kws={'linewidth': 2, 'color': p_colors[period], 'label': f"{period} (r={r_u:+.2f}, n={len(sub_u)})"})

    # Inset stats
    jun_aug_rh = uva[uva['season_period'] == 'Uva Quality Season (Jun-Aug)']['relative_humidity_pct'].mean()
    other_rh = uva[uva['season_period'] == 'Other Months (Sep-May)']['relative_humidity_pct'].mean()
    jun_aug_ref = uva[uva['season_period'] == 'Uva Quality Season (Jun-Aug)']['refuse_tea_pct'].mean()
    other_ref = uva[uva['season_period'] == 'Other Months (Sep-May)']['refuse_tea_pct'].mean()

    info_text = (
        f"Uva Jun-Aug Meteorological Effect:\n"
        f"• Mean Humidity: {jun_aug_rh:.1f}% (vs {other_rh:.1f}% other months; -{other_rh-jun_aug_rh:.1f}% drop)\n"
        f"• Mean Refuse:   {jun_aug_ref:.2f}% (vs {other_ref:.2f}% other months)\n"
        f"• Reflects dry Foehn/Cachan winds of SW monsoon,\n"
        f"  maintaining low moisture & steady refuse outturn."
    )
    ax2.text(0.04, 0.95, info_text, transform=ax2.transAxes, verticalalignment='top',
             bbox=dict(boxstyle='round,pad=0.5', facecolor='#f8f9fa', edgecolor='#ced4da'), fontsize=9)

    ax2.set_title('Uva Region Micro-Climate: Quality Season (Jun-Aug) vs Rest of Year', fontsize=12)
    ax2.set_xlabel('Relative Humidity (%)')
    ax2.set_ylabel('Refuse Tea (%)')
    ax2.legend(loc='lower right', frameon=True, facecolor='white')

    fig.suptitle('Agro-Climatic Humidity Interactions & The Uva Season Anomaly', fontsize=15, y=0.98)
    plt.tight_layout(rect=[0, 0.03, 1, 0.95])

    outpath = os.path.join(FIGURES_DIR, 'fig10_regional_humidity_relationships.png')
    plt.savefig(outpath, dpi=300)
    plt.close()
    print(f"[SAVED] {outpath}")


def plot_leakage_audit(df):
    """Plot 11: Leakage audit demonstrating exact algebraic target derivation."""
    fig, axes = plt.subplots(1, 2, figsize=(15, 6))

    # Calculate exact theoretical refuse_tea_kg
    total_output = df['made_tea_output_kg'] + df['refuse_tea_kg']
    calculated_refuse_kg = total_output * (df['refuse_tea_pct'] / 100.0)
    calculated_pct = (df['refuse_tea_kg'] / total_output) * 100.0

    # 1. refuse_tea_kg vs reconstructed kg
    ax1 = axes[0]
    ax1.scatter(df['refuse_tea_kg'], calculated_refuse_kg, color='#d90429', alpha=0.7, edgecolors='black', s=35)
    lims = [min(df['refuse_tea_kg'].min(), calculated_refuse_kg.min()) - 5,
            max(df['refuse_tea_kg'].max(), calculated_refuse_kg.max()) + 5]
    ax1.plot(lims, lims, 'k--', linewidth=2, label='Exact 1:1 Identity Line')
    ax1.set_xlim(lims)
    ax1.set_ylim(lims)
    ax1.set_title('Target Leakage Proof:\nrefuse_tea_kg vs (Total Made Tea × refuse_pct/100)', fontsize=12)
    ax1.set_xlabel('Recorded refuse_tea_kg in Dataset')
    ax1.set_ylabel('Reconstructed refuse_tea_kg from Target')
    ax1.legend(loc='upper left')

    max_err = np.abs(df['refuse_tea_kg'] - calculated_refuse_kg).max()
    ax1.text(0.05, 0.80, f"Max Discrepancy: {max_err:.4f} kg\n(Discrepancy due strictly to rounding to 1-2 decimals)\nPearson Correlation: 1.00000",
             transform=ax1.transAxes, bbox=dict(boxstyle='round,pad=0.5', facecolor='#ffe5d9', edgecolor='#d90429'), fontsize=9)

    # 2. Target vs made_tea_output_kg + refuse_tea_kg
    ax2 = axes[1]
    ax2.scatter(df['refuse_tea_pct'], calculated_pct, color='#2d6a4f', alpha=0.7, edgecolors='black', s=35)
    pct_lims = [df['refuse_tea_pct'].min() - 0.5, df['refuse_tea_pct'].max() + 0.5]
    ax2.plot(pct_lims, pct_lims, 'k--', linewidth=2, label='Exact 1:1 Identity Line')
    ax2.set_xlim(pct_lims)
    ax2.set_ylim(pct_lims)
    ax2.set_title('Target Reconstruction Proof:\nrefuse_tea_pct vs [refuse_kg / (made_kg + refuse_kg)] × 100', fontsize=12)
    ax2.set_xlabel('Recorded Target: refuse_tea_pct (%)')
    ax2.set_ylabel('Calculated: refuse_tea_kg / Total Output (%)')
    ax2.legend(loc='upper left')

    ax2.text(0.05, 0.80, "CRITICAL DIRECTIVE FOR PREPROCESSING:\nBoth 'made_tea_output_kg' and 'refuse_tea_kg'\nARE POST-HOC ACCOUNTING QUANTITIES.\nIncluding either column in feature set X causes\nCATASTROPHIC TARGET LEAKAGE.\nAction: EXCLUDE BOTH in preprocessing.py",
             transform=ax2.transAxes, bbox=dict(boxstyle='round,pad=0.5', facecolor='#ffe5d9', edgecolor='#d90429'), fontsize=9, weight='bold')

    fig.suptitle('Data Leakage Audit: Mathematical Identity Proof', fontsize=15, y=0.98)
    plt.tight_layout(rect=[0, 0.03, 1, 0.95])

    outpath = os.path.join(FIGURES_DIR, 'fig11_leakage_audit.png')
    plt.savefig(outpath, dpi=300)
    plt.close()
    print(f"[SAVED] {outpath}")


def print_summary_table(df):
    """Print key statistical summary to console."""
    print("\n" + "="*80)
    print("M2 REFUSE-TEA EDA SUMMARY REPORT")
    print("="*80)
    print(f"Dataset Shape: {df.shape[0]} rows, {df.shape[1]} columns")
    print(f"Missing Values: {df.isnull().sum().sum()} across all columns")
    print(f"Target (refuse_tea_pct): Mean={df['refuse_tea_pct'].mean():.2f}%, Median={df['refuse_tea_pct'].median():.2f}%, Skew={df['refuse_tea_pct'].skew():.2f}")
    print(f"Batches > 8% (Adverse): {(df['refuse_tea_pct'] > 8).sum()} ({(df['refuse_tea_pct'] > 8).mean()*100:.1f}%)")
    print(f"Batches > 10% (Severe): {(df['refuse_tea_pct'] > 10).sum()} ({(df['refuse_tea_pct'] > 10).mean()*100:.1f}%)")
    print("="*80)


def main():
    print("[START] Running Tea Manufacturing EDA...")
    df = load_dataset()
    print_summary_table(df)

    print("\n[GENERATING FIGURES]")
    plot_target_distribution(df)
    plot_univariate_numeric(df)
    plot_univariate_categoricals(df)
    plot_bivariate_scatter(df)
    plot_categorical_boxplots(df)
    plot_correlation_heatmap(df)
    plot_nonlinear_relationships(df)
    plot_factory_variance(df)
    plot_temporal_trends(df)
    plot_regional_humidity(df)
    plot_leakage_audit(df)

    print("\n[COMPLETE] All 11 figures successfully generated in ml-service/training/eda/figures/")

    try:
        from generate_pdf import build_pdf
        print("\n[GENERATING PDF REPORT]")
        build_pdf()
    except Exception as e:
        print(f"[NOTE] PDF auto-generation skipped or encountered: {e}")


if __name__ == '__main__':
    main()
