"""
Classification Model Evaluation PDF Report Generator

This script evaluates a classification model and generates a professional PDF report
containing metrics, classification report, and confusion matrix visualization.

Dependencies:
- reportlab
- matplotlib
- seaborn
- scikit-learn
"""

import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    Image,
    PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT


class ClassificationPDFReport:
    """Generate professional PDF reports for classification model evaluation."""
    
    def __init__(self, output_filename='model_evaluation_report.pdf', pagesize=A4):
        """
        Initialize the PDF report generator.
        
        Parameters:
        -----------
        output_filename : str
            Name of the output PDF file
        pagesize : tuple
            Page size for the PDF (default: A4)
        """
        self.output_filename = output_filename
        self.pagesize = pagesize
        self.doc = SimpleDocTemplate(
            output_filename,
            pagesize=pagesize,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        self.styles = getSampleStyleSheet()
        self.story = []
        self.temp_image_path = 'temp_confusion_matrix.png'
        
        # Add custom styles
        self._add_custom_styles()
    
    def _add_custom_styles(self):
        """Add custom paragraph styles for the report."""
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#2C3E50'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='CustomHeading2',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#34495E'),
            spaceAfter=12,
            spaceBefore=20,
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='Timestamp',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#7F8C8D'),
            alignment=TA_CENTER,
            spaceAfter=20
        ))
        
        self.styles.add(ParagraphStyle(
            name='ReportText',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#2C3E50'),
            spaceAfter=10,
            leading=14
        ))
    
    def add_title(self, title="Machine Learning Model Evaluation Report"):
        """Add title header with timestamp."""
        self.story.append(Paragraph(title, self.styles['CustomTitle']))
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.story.append(Paragraph(f"Generated: {timestamp}", self.styles['Timestamp']))
        self.story.append(Spacer(1, 0.2 * inch))
    
    def add_metrics_table(self, metrics_dict, average='weighted'):
        """
        Add a formatted table with evaluation metrics.
        
        Parameters:
        -----------
        metrics_dict : dict
            Dictionary containing accuracy, precision, recall, f1_score
        average : str
            Averaging method ('weighted' or 'macro')
        """
        self.story.append(Paragraph("Overall Performance Metrics", self.styles['CustomHeading2']))
        
        # Prepare table data
        table_data = [
            ['Metric', f'Value ({average})'],
            ['Accuracy', f"{metrics_dict['accuracy']:.4f}"],
            ['Precision', f"{metrics_dict['precision']:.4f}"],
            ['Recall', f"{metrics_dict['recall']:.4f}"],
            ['F1-Score', f"{metrics_dict['f1_score']:.4f}"]
        ]
        
        # Create table
        table = Table(table_data, colWidths=[2.5 * inch, 2 * inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498DB')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#ECF0F1')),
            ('BACKGROUND', (0, 2), (-1, 2), colors.whitesmoke),
            ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#ECF0F1')),
            ('BACKGROUND', (0, 4), (-1, 4), colors.whitesmoke),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#BDC3C7')),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 11),
        ]))
        
        self.story.append(table)
        self.story.append(Spacer(1, 0.3 * inch))
    
    def add_classification_report(self, report_text):
        """
        Add detailed class-wise classification report.
        
        Parameters:
        -----------
        report_text : str
            Classification report string from sklearn
        """
        self.story.append(Paragraph("Detailed Classification Report", self.styles['CustomHeading2']))
        
        # Format the report text for PDF
        formatted_report = report_text.replace('\n', '<br/>')
        self.story.append(Paragraph(formatted_report, self.styles['ReportText']))
        self.story.append(Spacer(1, 0.3 * inch))
    
    def add_confusion_matrix(self, y_true, y_pred, class_names=None):
        """
        Generate and add confusion matrix heatmap to the report.
        
        Parameters:
        -----------
        y_true : array-like
            True labels
        y_pred : array-like
            Predicted labels
        class_names : list, optional
            Names of the classes
        """
        self.story.append(Paragraph("Confusion Matrix", self.styles['CustomHeading2']))
        
        # Generate confusion matrix
        cm = confusion_matrix(y_true, y_pred)
        
        # Create heatmap
        plt.figure(figsize=(8, 6))
        sns.heatmap(
            cm,
            annot=True,
            fmt='d',
            cmap='Blues',
            xticklabels=class_names if class_names else range(len(cm)),
            yticklabels=class_names if class_names else range(len(cm)),
            cbar_kws={'label': 'Count'},
            linewidths=0.5,
            linecolor='gray'
        )
        plt.title('Confusion Matrix', fontsize=14, fontweight='bold', pad=20)
        plt.xlabel('Predicted Label', fontsize=12, fontweight='bold')
        plt.ylabel('True Label', fontsize=12, fontweight='bold')
        plt.tight_layout()
        
        # Save temporary image
        plt.savefig(self.temp_image_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        # Add image to PDF
        img = Image(self.temp_image_path, width=5 * inch, height=3.75 * inch)
        self.story.append(img)
        self.story.append(Spacer(1, 0.3 * inch))
    
    def generate(self, y_true, y_pred, class_names=None, average='weighted'):
        """
        Generate the complete PDF report.
        
        Parameters:
        -----------
        y_true : array-like
            True labels
        y_pred : array-like
            Predicted labels
        class_names : list, optional
            Names of the classes
        average : str
            Averaging method for multi-class metrics ('weighted' or 'macro')
        """
        # Calculate metrics
        accuracy = accuracy_score(y_true, y_pred)
        precision = precision_score(y_true, y_pred, average=average)
        recall = recall_score(y_true, y_pred, average=average)
        f1 = f1_score(y_true, y_pred, average=average)
        
        metrics_dict = {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1_score': f1
        }
        
        # Generate classification report text
        target_names = class_names if class_names else [f"Class {i}" for i in range(len(np.unique(y_true)))]
        report_text = classification_report(y_true, y_pred, target_names=target_names)
        
        # Build PDF
        self.add_title()
        self.add_metrics_table(metrics_dict, average)
        self.add_classification_report(report_text)
        self.add_confusion_matrix(y_true, y_pred, class_names)
        
        # Build PDF
        self.doc.build(self.story)
        
        # Clean up temporary file
        import os
        if os.path.exists(self.temp_image_path):
            os.remove(self.temp_image_path)
        
        print(f"PDF report generated successfully: {self.output_filename}")


def evaluate_and_generate_report(y_true, y_pred, class_names=None, 
                                 output_filename='model_evaluation_report.pdf',
                                 average='weighted'):
    """
    Convenience function to evaluate model and generate PDF report.
    
    Parameters:
    -----------
    y_true : array-like
        True labels
    y_pred : array-like
        Predicted labels
    class_names : list, optional
        Names of the classes
    output_filename : str
        Output PDF filename
    average : str
        Averaging method ('weighted' or 'macro')
    """
    report_generator = ClassificationPDFReport(output_filename)
    report_generator.generate(y_true, y_pred, class_names, average)


if __name__ == "__main__":
    # Example 1: Binary Classification
    print("Generating Binary Classification Report...")
    y_true_binary = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1]
    y_pred_binary = [0, 1, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1]
    class_names_binary = ['Negative', 'Positive']
    
    evaluate_and_generate_report(
        y_true_binary, 
        y_pred_binary, 
        class_names_binary,
        'binary_classification_report.pdf',
        average='binary'
    )
    
    # Example 2: Multi-class Classification
    print("\nGenerating Multi-class Classification Report...")
    from sklearn.datasets import load_iris
    from sklearn.model_selection import train_test_split
    from sklearn.ensemble import RandomForestClassifier
    
    # Load iris dataset
    iris = load_iris()
    X, y = iris.data, iris.target
    class_names_iris = iris.target_names.tolist()
    
    # Split and train
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42, stratify=y
    )
    
    model = RandomForestClassifier(random_state=42)
    model.fit(X_train, y_train)
    y_pred_iris = model.predict(X_test)
    
    evaluate_and_generate_report(
        y_test,
        y_pred_iris,
        class_names_iris,
        'multiclass_classification_report.pdf',
        average='weighted'
    )
    
    print("\nBoth reports generated successfully!")
