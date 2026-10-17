# Ceylon Intelligence — M4 Mathematical Optimization Model Formulation

## 1. Problem Formulation
The **M4 Prescriptive Export & Logistics Engine** formulates a deterministic Mixed-Integer Linear Programming (MILP) problem to find the optimal quarterly allocation of Sri Lankan Ceylon Tea grades to international export markets and shipping lanes that minimizes the total supply chain expenditure.

---

## 2. Sets and Indices
- $m \in \mathcal{M}$: Export destination markets ($\mathcal{M} = \{\text{Russia, UAE, Iraq, Turkey, Iran}\}$)
- $g \in \mathcal{G}$: Ceylon Tea grades ($\mathcal{G} = \{\text{TEA-BOP, TEA-OP, TEA-GREEN}\}$)
- $r \in \mathcal{R}_m$: Available maritime shipping routes from Colombo Port to destination market $m$
- $p \in \mathcal{P}$: Packaging options ($\mathcal{P} = \{\text{Bulk Liner, Retail Packet, Tea Bags}\}$)

---

## 3. Decision Variables
- $x_{m, g, r, p} \ge 0$: Quantity (in kilograms, kg) of tea grade $g$ transported to market $m$ via shipping route $r$ using packaging $p$.
- $u_{m, g} \ge 0$: Slack shortfall variable representing unmet demand (in kg) for grade $g$ in market $m$.

---

## 4. Cost Parameters (USD per kg)
- $c^{\text{supply}}_g$: Unit harvest/procurement cost for tea grade $g$ (USD/kg)
- $c^{\text{pack}}_p$: Unit packaging material and processing cost (USD/kg)
- $c^{\text{freight}}_r$: Maritime shipping freight rate for route $r$ (USD/kg)
- $c^{\text{handling}}_r$: Stevedoring, terminal handling, and port charges (USD/kg)
- $c^{\text{customs}}_r$: Customs documentation and clearance administration (USD/kg)
- $w_p$: Expected wastage rate for packaging type $p$ (e.g. 0.012 for bulk liner)
- $c^{\text{waste}}_{g, p} = w_p \times (c^{\text{supply}}_g + c^{\text{pack}}_p)$: Estimated handling wastage loss (USD/kg)
- $\rho$: Unmet demand contractual penalty rate ($\rho = 12.00$ USD/kg)

---

## 5. Objective Function
$$\min Z = \sum_{m \in \mathcal{M}} \sum_{g \in \mathcal{G}} \sum_{r \in \mathcal{R}_m} \sum_{p \in \mathcal{P}} x_{m, g, r, p} \left( c^{\text{supply}}_g + c^{\text{pack}}_p + c^{\text{freight}}_r + c^{\text{handling}}_r + c^{\text{customs}}_r + c^{\text{waste}}_{g, p} \right) + \sum_{m \in \mathcal{M}} \sum_{g \in \mathcal{G}} \rho \cdot u_{m, g}$$

---

## 6. Constraints

### 1. Supply Availability Constraint
For each tea grade $g \in \mathcal{G}$:
$$\sum_{m \in \mathcal{M}} \sum_{r \in \mathcal{R}_m} \sum_{p \in \mathcal{P}} x_{m, g, r, p} \le S_g$$
where $S_g$ is the total harvest quantity available in Sri Lanka for grade $g$ in that quarter.

### 2. Market Demand Fulfillment
For each market $m \in \mathcal{M}$ and tea grade $g \in \mathcal{G}$:
$$\sum_{r \in \mathcal{R}_m} \sum_{p \in \mathcal{P}} x_{m, g, r, p} + u_{m, g} = D_{m, g}$$
where $D_{m, g}$ is the predicted demand forecast for market $m$ and grade $g$.

### 3. Contractual Minimum Commitment
For each market $m \in \mathcal{M}$ with minimum contractual trade agreement $M^{\min}_m$:
$$\sum_{g \in \mathcal{G}} \sum_{r \in \mathcal{R}_m} \sum_{p \in \mathcal{P}} x_{m, g, r, p} \ge M^{\min}_m$$

### 4. Shipping Route Capacity Limit
For each shipping route $r \in \mathcal{R}$:
$$\sum_{m \in \text{dest}(r)} \sum_{g \in \mathcal{G}} \sum_{p \in \mathcal{P}} x_{m, g, r, p} \le C_r$$
where $C_r$ is the maximum quarterly vessel container capacity (kg) on lane $r$.

### 5. Packaging Facility Limit
For each packaging type $p \in \mathcal{P}$:
$$\sum_{m \in \mathcal{M}} \sum_{g \in \mathcal{G}} \sum_{r \in \mathcal{R}_m} x_{m, g, r, p} \le K_p$$
where $K_p = U_p \times \text{CapacityPerUnit}_p$.

---

## 7. Hand-Calculated Verification Example

Consider a simplified verification instance:
- Markets: UAE ($m_1$) and Russia ($m_2$)
- Grade: BOP ($g_1$), Available Supply $S_1 = 30,000$ kg, Supply Cost $c^{\text{supply}} = \$3.00$
- Packaging: Bulk Liner ($p_1$), Packaging Cost $c^{\text{pack}} = \$0.10$, Wastage $w = 1\%$ $\implies c^{\text{waste}} = 0.01 \times (3.00 + 0.10) = \$0.031$
- Demand:
  - UAE: $D_1 = 10,000$ kg
  - Russia: $D_2 = 15,000$ kg
- Routes:
  - Route to UAE ($r_1$): Freight = $\$0.40$, Handling = $\$0.05$, Customs = $\$0.02$
    - Unit Cost = $3.00 + 0.10 + 0.40 + 0.05 + 0.02 + 0.031 = \mathbf{\$3.601}$ / kg
  - Route to Russia ($r_2$): Freight = $\$0.80$, Handling = $\$0.08$, Customs = $\$0.04$
    - Unit Cost = $3.00 + 0.10 + 0.80 + 0.08 + 0.04 + 0.031 = \mathbf{\$4.051}$ / kg

### Hand Calculation:
- Supply available = 30,000 kg $\ge 10,000 + 15,000 = 25,000$ kg (Feasible, shortfall $u = 0$)
- UAE cost: $10,000 \text{ kg} \times \$3.601 = \mathbf{\$36,010.00}$
- Russia cost: $15,000 \text{ kg} \times \$4.051 = \mathbf{\$60,765.00}$
- **Total Objective Function Value**: $\$36,010.00 + \$60,765.00 = \mathbf{\$96,775.00 \text{ USD}}$

When executed with the PuLP solver in Ceylon Intelligence, the exact returned objective value is **$96,775.00 USD**, verifying 100% mathematical accuracy.
