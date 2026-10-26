import React, { useState } from 'react';
import {
  ArrowRight,
  Bug,
  Check,
  Coffee,
  ShieldAlert,
  Smartphone,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import { SalaryProfile } from '../types/finance';
import { formatCOP } from '../utils/money';
import { getMonthlyIncome } from '../utils/contract';

interface AntExpenseSummary {
  totalMonth: number;
  percentageOfSalary: number;
  projectedYearlyLoss: number;
  projected5YearInvestmentGain: number;
  topAntCategories: { name: string; amount: number; percentage: number }[];
}

interface Props {
  salary: SalaryProfile;
  antSummary: AntExpenseSummary;
  onOpenExpenseModal: () => void;
}

export const AntExpensesWidget: React.FC<Props> = ({
  salary,
  antSummary,
  onOpenExpenseModal,
}) => {
  const [challengeActive, setChallengeActive] = useState(false);

  const money = (value: number, _decimals = 0) => formatCOP(value);

  const getCategoryIcon = (name: string) => {
    if (name.toLowerCase().includes('café') || name.toLowerCase().includes('snack')) return Coffee;
    if (name.toLowerCase().includes('suscrip')) return Smartphone;
    return Bug;
  };

  return (
    <section className="vt-card vt-ant">
      <div className="vt-card-head">
        <div>
          <p className="vt-kicker">Radar de fugas</p>
          <h2 className="vt-card-title">
            <Bug size={15} />
            Gastos hormiga
            <span className="vt-badge accent">Detector activo</span>
          </h2>
          <p className="vt-card-sub">Micropagos cotidianos que erosionan tu salario sin que los notes.</p>
        </div>
        <button type="button" className="vt-text-btn" onClick={onOpenExpenseModal}>
          Añadir microgasto <ArrowRight size={13} />
        </button>
      </div>

      <div className="vt-metric-grid">
        <div className="vt-metric">
          <span>Gastado este mes</span>
          <strong>{money(antSummary.totalMonth)}</strong>
          <small>{antSummary.percentageOfSalary.toFixed(1)}% de tu nómina</small>
        </div>

        <div className="vt-metric danger">
          <span><TrendingDown size={12} /> Pérdida anual</span>
          <strong>-{money(antSummary.projectedYearlyLoss, 0)}</strong>
          <small>{(antSummary.projectedYearlyLoss / (getMonthlyIncome(salary) || 1)).toFixed(1)} meses de trabajo</small>
        </div>

        <div className="vt-metric positive">
          <span><Sparkles size={12} /> Invertido a 5 años</span>
          <strong>+{money(antSummary.projected5YearInvestmentGain, 0)}</strong>
          <small>al 8% anual compuesto</small>
        </div>
      </div>

      <div className="vt-ant-body">
        <div className="vt-day-section">
          <div className="vt-day-section-head">
            <h3>¿En qué se va?</h3>
            <span>{antSummary.topAntCategories.length} categorías</span>
          </div>

          {antSummary.topAntCategories.length === 0 ? (
            <div className="vt-day-empty">
              <Sparkles size={16} />
              Sin gastos hormiga este mes. Vas limpio.
            </div>
          ) : (
            <div className="vt-ant-list">
              {antSummary.topAntCategories.map((category) => {
                const Icon = getCategoryIcon(category.name);
                return (
                  <div key={category.name} className="vt-ant-item">
                    <div className="vt-ant-icon"><Icon size={14} /></div>
                    <div className="vt-ant-main">
                      <div className="vt-ant-item-head">
                        <strong>{category.name}</strong>
                        <span>{category.percentage}%</span>
                      </div>
                      <div className="vt-ant-bar">
                        <i style={{ width: `${Math.min(100, category.percentage)}%` }} />
                      </div>
                    </div>
                    <strong className="vt-ant-amt">-{money(category.amount)}</strong>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={`vt-challenge ${challengeActive ? 'on' : ''}`}>
          <div className="vt-challenge-icon"><ShieldAlert size={19} /></div>
          <p className="vt-kicker">Reto de 7 días</p>
          <h3>Cero gastos hormiga</h3>
          <p>
            Pausa cafés fuera, delivery por pereza y compras impulsivas durante una semana.
            Ahorro estimado: <strong>{money(antSummary.totalMonth / 4, 0)}</strong>.
          </p>
          <button
            type="button"
            className={`vt-btn ${challengeActive ? 'vt-btn-lime' : ''}`}
            onClick={() => setChallengeActive(!challengeActive)}
          >
            {challengeActive ? (
              <>
                <Check size={14} /> Reto en marcha
              </>
            ) : (
              'Aceptar reto'
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
