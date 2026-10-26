import React, { useState } from 'react';
import {
  Bug,
  Coffee,
  Home,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  Trash2,
  Utensils,
  Zap,
} from 'lucide-react';
import { ExpenseRecord } from '../types/finance';
import { formatCOP } from '../utils/money';

interface Props {
  expenses: ExpenseRecord[];
  onOpenAddModal: () => void;
  onDeleteExpense: (id: string) => void;
}

const iconForCategory = (expense: ExpenseRecord) => {
  if (expense.isAntExpense) return Bug;
  switch (expense.category) {
    case 'vivienda':
      return Home;
    case 'alimentacion':
      return Utensils;
    case 'servicios':
      return Zap;
    case 'cafe_snacks':
      return Coffee;
    case 'compras_impulso':
      return ShoppingBag;
    default:
      return Receipt;
  }
};

export const ExpenseListView: React.FC<Props> = ({
  expenses,
  onOpenAddModal,
  onDeleteExpense,
}) => {
  const [search, setSearch] = useState('');
  const [onlyAnt, setOnlyAnt] = useState(false);

  const filtered = expenses
    .filter((expense) => {
      const matchesSearch = expense.title.toLowerCase().includes(search.toLowerCase()) ||
        expense.category.toLowerCase().includes(search.toLowerCase());
      const matchesAnt = onlyAnt ? expense.isAntExpense : true;
      return matchesSearch && matchesAnt;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalSum = filtered.reduce((sum, expense) => sum + expense.amount, 0);
  const antCount = filtered.filter((expense) => expense.isAntExpense).length;

  const money = (value: number) => formatCOP(value);

  return (
    <section className="vt-card vt-expenses-card">
      <div className="vt-card-head">
        <div>
          <p className="vt-kicker">Registro de movimientos</p>
          <h2 className="vt-card-title">{filtered.length} gastos · {money(totalSum)}</h2>
          <p className="vt-card-sub">Los gastos hormiga están marcados para detectar fugas.</p>
        </div>
        <button id="btn-add-expense-main" type="button" className="vt-btn vt-btn-lime" onClick={onOpenAddModal}>
          <Plus size={15} />
          Registrar gasto
        </button>
      </div>

      <div className="vt-toolbar">
        <label className="vt-search">
          <Search size={15} />
          <span className="sr-only">Buscar gastos</span>
          <input
            id="expense-search-input"
            type="text"
            placeholder="Buscar por concepto o categoría..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <div className="vt-toolbar-right">
          <button
            id="btn-filter-ant"
            type="button"
            className={`vt-filter ${onlyAnt ? 'on' : ''}`}
            onClick={() => setOnlyAnt(!onlyAnt)}
            aria-pressed={onlyAnt}
          >
            <Bug size={13} /> Hormiga
            <span>{antCount}</span>
          </button>
          <span className="vt-toolbar-total">
            Total <strong>-{money(totalSum)}</strong>
          </span>
        </div>
      </div>

      <div className="vt-expense-list">
        {filtered.length === 0 ? (
          <div className="vt-empty-state">
            <Receipt size={20} />
            <strong>Sin movimientos</strong>
            <p>No hay gastos que coincidan con los filtros actuales.</p>
          </div>
        ) : (
          filtered.map((expense) => {
            const Icon = iconForCategory(expense);
            return (
              <article key={expense.id} className={`vt-expense-row ${expense.isAntExpense ? 'ant' : ''}`}>
                <div className="vt-expense-icon">
                  <Icon size={16} />
                </div>

                <div className="vt-expense-main">
                  <div className="vt-expense-title">
                    <h3>{expense.title}</h3>
                    {expense.isAntExpense && <span className="vt-badge warn">Hormiga</span>}
                  </div>
                  <p className="vt-expense-meta">
                    <span>{expense.date}</span>
                    <i />
                    <span className="vt-capitalize">{expense.category.replace(/_/g, ' ')}</span>
                    {expense.notes && (
                      <>
                        <i />
                        <span className="vt-expense-note">{expense.notes}</span>
                      </>
                    )}
                  </p>
                </div>

                <div className="vt-expense-amt">
                  <strong>-{money(expense.amount)}</strong>
                  <button
                    id={`btn-del-expense-${expense.id}`}
                    type="button"
                    className="vt-icon-btn vt-icon-btn-danger"
                    onClick={() => onDeleteExpense(expense.id)}
                    title="Eliminar gasto"
                    aria-label={`Eliminar ${expense.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};
