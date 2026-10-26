import React from 'react';
import {
  ArrowRight,
  Brain,
  Check,
  CircleCheck,
  Flame,
  Lightbulb,
  PieChart,
  Snowflake,
  Target,
} from 'lucide-react';
import { StrategyReport } from '../services/strategyEngine';
import { SalaryProfile, StrategyMethod } from '../types/finance';
import { formatCOP } from '../utils/money';
import { getMonthlyIncome } from '../utils/contract';

interface Props {
  report: StrategyReport;
  salary: SalaryProfile;
  onMethodChange: (method: StrategyMethod) => void;
  onOpenDebtPayment: (debtId: string) => void;
}

export const StrategyAdvisorWidget: React.FC<Props> = ({
  report,
  salary,
  onMethodChange,
  onOpenDebtPayment,
}) => {
  const { priorityDebt, method, paycheckDistribution, actionAdvices } = report;

  const money = (value: number, _decimals = 0) => formatCOP(value);

  return (
    <div className="vt-strategy">
      <section className="vt-card vt-strategy-top">
        <div className="vt-card-head">
          <div>
            <p className="vt-kicker">Plan inteligente</p>
            <h2 className="vt-card-title">
              <Brain size={15} />
              Estrategia recomendada
            </h2>
            <p className="vt-card-sub">Qué deuda atacar primero y cómo distribuir tu nómina.</p>
          </div>

          <div className="vt-segment" role="group" aria-label="Método de pago de deudas">
            <button
              id="strategy-avalanche-btn"
              type="button"
              className={method === 'avalancha' ? 'on' : ''}
              onClick={() => onMethodChange('avalancha')}
            >
              <Flame size={13} />
              Avalancha
            </button>
            <button
              id="strategy-snowball-btn"
              type="button"
              className={method === 'bola_de_nieve' ? 'on' : ''}
              onClick={() => onMethodChange('bola_de_nieve')}
            >
              <Snowflake size={13} />
              Bola de nieve
            </button>
          </div>
        </div>

        {priorityDebt ? (
          <div className="vt-priority">
            <div className="vt-priority-main">
              <span className="vt-badge accent">
                <Target size={11} /> Prioridad número uno
              </span>
              <h3>{priorityDebt.title}</h3>
              <p>
                {method === 'avalancha' ? (
                  <>
                    Es tu deuda más cara con un <strong>{priorityDebt.annualInterestRate}% TAE</strong>.
                    Paga el mínimo en las demás y dirige todo el excedente aquí para dejar
                    de regalar intereses al banco.
                  </>
                ) : (
                  <>
                    Es la deuda con menor saldo (<strong>{money(priorityDebt.totalAmount)}</strong>).
                    Liquidarla pronto elimina un acreedor y libera presión en tu flujo mensual.
                  </>
                )}
              </p>
            </div>

            <div className="vt-priority-metrics">
              <div>
                <span>Saldo</span>
                <strong>{money(priorityDebt.totalAmount)}</strong>
              </div>
              <div>
                <span>Cuota</span>
                <strong>{money(priorityDebt.monthlyPayment)}</strong>
              </div>
              <div>
                <span>Interés</span>
                <strong>{priorityDebt.annualInterestRate}%</strong>
              </div>
            </div>

            <div className="vt-priority-action">
              <button
                id="btn-pay-priority-debt"
                type="button"
                className="vt-btn vt-btn-lime"
                onClick={() => onOpenDebtPayment(priorityDebt.id)}
              >
                Abonar a esta deuda <ArrowRight size={14} />
              </button>
              {report.estimatedInterestSaved && report.estimatedInterestSaved > 0 && (
                <small>Ahorro estimado en intereses: {money(report.estimatedInterestSaved)}</small>
              )}
            </div>
          </div>
        ) : (
          <div className="vt-clear-inline">
            <CircleCheck size={17} />
            <span>No tienes deudas activas. Todo tu flujo está libre.</span>
          </div>
        )}
      </section>

      <section className="vt-card vt-plan-card">
        <div className="vt-card-head">
          <div>
            <p className="vt-kicker">Regla 50 / 30 / 20</p>
            <h2 className="vt-card-title">
              <PieChart size={15} />
              El día que cobras
            </h2>
          </div>
          <span className="vt-card-meta">Nómina {money(getMonthlyIncome(salary))}</span>
        </div>

        <div className="vt-plan-big">{money(getMonthlyIncome(salary))}</div>
        <p className="vt-plan-sub">Separa tu nómina en tres sobres antes de gastar.</p>

        <div className="vt-plan-grid">
          <div className="vt-plan-row needs">
            <div className="vt-plan-head">
              <span>50% Necesidades</span>
              <strong>{money(paycheckDistribution.needsAmount)}</strong>
            </div>
            <div className="vt-plan-bar"><i style={{ width: '50%' }} /></div>
            <p>Vivienda, comida, servicios y cuotas mínimas.</p>
          </div>

          <div className="vt-plan-row wants">
            <div className="vt-plan-head">
              <span>30% Estilo de vida</span>
              <strong>{money(paycheckDistribution.wantsAmount)}</strong>
            </div>
            <div className="vt-plan-bar"><i style={{ width: '30%' }} /></div>
            <p>Ocio, cenas y caprichos. Si se acaba, se pausa.</p>
          </div>

          <div className="vt-plan-row future">
            <div className="vt-plan-head">
              <span>20% Deuda y ahorro</span>
              <strong>{money(paycheckDistribution.savingsAndExtraDebtAmount)}</strong>
            </div>
            <div className="vt-plan-bar"><i style={{ width: '20%' }} /></div>
            <p>Amortiza la prioritaria o refuerza tu colchón.</p>
          </div>
        </div>
      </section>

      <section className="vt-card vt-advice-card">
        <div className="vt-card-head">
          <div>
            <p className="vt-kicker">Siguiente acción</p>
            <h2 className="vt-card-title"><Lightbulb size={15} /> Consejos clave</h2>
          </div>
          <span className="vt-card-meta">{actionAdvices.length} recomendaciones</span>
        </div>

        <div className="vt-advice-grid">
          {actionAdvices.map((advice) => {
            const isUrgent = advice.severity === 'urgente';
            const isHigh = advice.severity === 'alta';

            return (
              <article
                key={advice.id}
                className={`vt-advice ${isUrgent ? 'urgent' : isHigh ? 'high' : ''}`}
              >
                <div className="vt-advice-top">
                  <span className={`vt-badge ${isUrgent ? 'danger' : isHigh ? 'warn' : 'neutral'}`}>
                    {advice.severity}
                  </span>
                  {advice.impactEstimate && <strong>{advice.impactEstimate}</strong>}
                </div>
                <h3>{advice.title}</h3>
                <p>{advice.description}</p>
                <div className="vt-advice-action">
                  <span><Check size={12} /> Acción</span>
                  <strong>{advice.suggestedActionText}</strong>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
