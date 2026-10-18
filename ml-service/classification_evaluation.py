"""
Classification Model Evaluation Script

This script demonstrates how to evaluate a classification model using scikit-learn.
It calculates and displays:
- Accuracy
- Precision (macro/weighted for multi-class, binary for binary)
- Recall
- F1-score
- Confusion Matrix with heatmap visualization
"""

import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import make_classification, load_iris


def evaluate_binary_classification():
    """Evaluate a binary classification model."""
    print("=" * 60)
    print("BINARY CLASSIFICATION EVALUATION")
    print("=" * 60)
    
    # Generate synthetic binary classification data
    X, y = make_classification(
        n_samples=1000,
        n_features=20,
        n_informative=15,
        n_redundant=5,
        n_classes=2,
        random_state=42
    )
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train model
    model = RandomForestClassifier(random_state=42)
    model.fit(X_train, y_train)
    
    # Predict
    y_pred = model.predict(X_test)
    
    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='binary')
    recall = recall_score(y_test, y_pred, average='binary')
    f1 = f1_score(y_test, y_pred, average='binary')
    
    # Print metrics
    print(f"\nAccuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1-Score:  {f1:.4f}")
    
    # Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    print("\nConfusion Matrix:")
    print(cm)
    
    # Plot Confusion Matrix
    plt.figure(figsize=(8, 6))
    sns.heatmap(
        cm,
        annot=True,
        fmt='d',
        cmap='Blues',
        xticklabels=['Negative', 'Positive'],
        yticklabels=['Negative', 'Positive'],
        cbar_kws={'label': 'Count'}
    )
    plt.title('Binary Classification Confusion Matrix', fontsize=14, fontweight='bold')
    plt.xlabel('Predicted Label', fontsize=12)
    plt.ylabel('True Label', fontsize=12)
    plt.tight_layout()
    plt.savefig('binary_confusion_matrix.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Negative', 'Positive']))


def evaluate_multiclass_classification():
    """Evaluate a multi-class classification model."""
    print("\n" + "=" * 60)
    print("MULTI-CLASS CLASSIFICATION EVALUATION")
    print("=" * 60)
    
    # Load iris dataset (3 classes)
    iris = load_iris()
    X, y = iris.data, iris.target
    class_names = iris.target_names
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Train model
    model = RandomForestClassifier(random_state=42)
    model.fit(X_train, y_train)
    
    # Predict
    y_pred = model.predict(X_test)
    
    # Calculate metrics with different averaging methods
    accuracy = accuracy_score(y_test, y_pred)
    precision_macro = precision_score(y_test, y_pred, average='macro')
    precision_weighted = precision_score(y_test, y_pred, average='weighted')
    recall_macro = recall_score(y_test, y_pred, average='macro')
    recall_weighted = recall_score(y_test, y_pred, average='weighted')
    f1_macro = f1_score(y_test, y_pred, average='macro')
    f1_weighted = f1_score(y_test, y_pred, average='weighted')
    
    # Print metrics
    print(f"\nAccuracy:           {accuracy:.4f}")
    print(f"Precision (macro):  {precision_macro:.4f}")
    print(f"Precision (weighted): {precision_weighted:.4f}")
    print(f"Recall (macro):     {recall_macro:.4f}")
    print(f"Recall (weighted):  {recall_weighted:.4f}")
    print(f"F1-Score (macro):  {f1_macro:.4f}")
    print(f"F1-Score (weighted): {f1_weighted:.4f}")
    
    # Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    print("\nConfusion Matrix:")
    print(cm)
    
    # Plot Confusion Matrix
    plt.figure(figsize=(8, 6))
    sns.heatmap(
        cm,
        annot=True,
        fmt='d',
        cmap='Greens',
        xticklabels=class_names,
        yticklabels=class_names,
        cbar_kws={'label': 'Count'}
    )
    plt.title('Multi-Class Classification Confusion Matrix', fontsize=14, fontweight='bold')
    plt.xlabel('Predicted Label', fontsize=12)
    plt.ylabel('True Label', fontsize=12)
    plt.tight_layout()
    plt.savefig('multiclass_confusion_matrix.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=class_names))


def evaluate_with_custom_data(y_true, y_pred, class_names=None, average='macro'):
    """
    Evaluate a classification model with custom true and predicted labels.
    
    Parameters:
    -----------
    y_true : array-like
        True labels
    y_pred : array-like
        Predicted labels
    class_names : list, optional
        Names of the classes for confusion matrix labels
    average : str, default='macro'
        Averaging method for multi-class metrics ('macro', 'weighted', 'micro')
    """
    print("=" * 60)
    print("CUSTOM DATA EVALUATION")
    print("=" * 60)
    
    # Calculate metrics
    accuracy = accuracy_score(y_true, y_pred)
    
    # Determine if binary or multi-class
    unique_classes = len(np.unique(np.concatenate([y_true, y_pred])))
    
    if unique_classes == 2:
        precision = precision_score(y_true, y_pred, average='binary')
        recall = recall_score(y_true, y_pred, average='binary')
        f1 = f1_score(y_true, y_pred, average='binary')
        avg_note = "(binary)"
    else:
        precision = precision_score(y_true, y_pred, average=average)
        recall = recall_score(y_true, y_pred, average=average)
        f1 = f1_score(y_true, y_pred, average=average)
        avg_note = f"({average})"
    
    # Print metrics
    print(f"\nAccuracy:  {accuracy:.4f}")
    print(f"Precision {avg_note}: {precision:.4f}")
    print(f"Recall {avg_note}:    {recall:.4f}")
    print(f"F1-Score {avg_note}:  {f1:.4f}")
    
    # Confusion Matrix
    cm = confusion_matrix(y_true, y_pred)
    print("\nConfusion Matrix:")
    print(cm)
    
    # Plot Confusion Matrix
    plt.figure(figsize=(8, 6))
    sns.heatmap(
        cm,
        annot=True,
        fmt='d',
        cmap='viridis',
        xticklabels=class_names if class_names else range(len(cm)),
        yticklabels=class_names if class_names else range(len(cm)),
        cbar_kws={'label': 'Count'}
    )
    plt.title('Confusion Matrix', fontsize=14, fontweight='bold')
    plt.xlabel('Predicted Label', fontsize=12)
    plt.ylabel('True Label', fontsize=12)
    plt.tight_layout()
    plt.savefig('custom_confusion_matrix.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    print("\nClassification Report:")
    target_names = class_names if class_names else [f"Class {i}" for i in range(len(cm))]
    print(classification_report(y_true, y_pred, target_names=target_names))


if __name__ == "__main__":
    # Run binary classification evaluation
    evaluate_binary_classification()
    
    # Run multi-class classification evaluation
    evaluate_multiclass_classification()
    
    # Example with custom data
    print("\n" + "=" * 60)
    print("EXAMPLE: Custom Data Evaluation")
    print("=" * 60)
    y_true_example = [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2]
    y_pred_example = [0, 1, 1, 0, 1, 2, 0, 2, 2, 0, 0, 2]
    class_names_example = ['Class A', 'Class B', 'Class C']
    evaluate_with_custom_data(y_true_example, y_pred_example, class_names_example, average='macro')
