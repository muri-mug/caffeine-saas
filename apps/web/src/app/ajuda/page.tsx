'use client';

import { useState } from 'react';
import { Card } from '@tremor/react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/lib/settings-context';
import {
  ChevronDown, ChevronUp,
  LayoutDashboard, ShoppingCart, Wallet, FileText, Package, HelpCircle,
} from '@/lib/icons';

// ── Conteúdo bilíngue ─────────────────────────────────────────────────────────

const content = {
  pt: {
    title: 'Ajuda & Documentação',
    subtitle: 'Entenda cada seção do sistema e como configurar corretamente o Loyverse para obter os melhores resultados.',
    loyverseNote: 'Integração com Loyverse POS',
    loyverseDesc: 'Todos os dados financeiros exibidos neste sistema são sincronizados automaticamente a partir do seu Loyverse POS. Para que os números sejam precisos, é fundamental que a operação no Loyverse siga as boas práticas descritas em cada seção abaixo.',
    sections: [
      {
        id: 'dashboard',
        icon: 'LayoutDashboard',
        title: 'Visão Geral (Dashboard)',
        description: 'Painel principal com os indicadores financeiros consolidados do período selecionado. É o ponto de partida para entender a saúde financeira do negócio em tempo real.',
        what: [
          { term: 'Receita Bruta', def: 'Total faturado ao preço cheio dos produtos, antes de qualquer desconto. Exemplo: vendeu 10 cafés a R$10,00 = Receita Bruta R$100,00.' },
          { term: 'Nº de Vendas', def: 'Quantidade de cupons/recibos emitidos no período. Cada cupom = uma transação, independente de quantos itens contém.' },
          { term: 'Ticket Médio', def: 'Receita (após descontos) dividida pelo número de vendas. Mede o valor médio de cada compra.' },
          { term: 'Margem Bruta', def: 'Percentual do lucro bruto sobre a receita líquida: (Receita Líq. − CMV) ÷ Receita Líq. × 100. Só é calculada se o custo dos produtos estiver cadastrado.' },
          { term: 'Receita Líquida', def: 'Receita após descontos menos os impostos embutidos nos preços.' },
          { term: 'CMV (Custo da Mercadoria Vendida)', def: 'Soma dos custos de todos os produtos vendidos. Depende do cadastro de custo por variante no Loyverse.' },
          { term: 'Lucro Bruto', def: 'Receita Líquida menos o CMV.' },
          { term: 'Gráfico horário', def: 'Receita distribuída por hora do dia, agrupada no fuso horário América/São Paulo.' },
          { term: 'Formas de pagamento', def: 'Distribuição das vendas por tipo de pagamento (dinheiro, cartão, Pix, etc.).' },
        ],
        faqs: [
          {
            q: 'Por que o CMV aparece zerado ou muito baixo?',
            a: 'O custo dos produtos não está cadastrado no Loyverse. Acesse Produtos → selecione o item → edite cada variante → preencha o campo "Custo". Após salvar e sincronizar, os próximas vendas já refletirão o CMV.',
          },
          {
            q: 'Por que a Margem Bruta está em 0%?',
            a: 'Mesma causa do CMV zerado. Sem custo cadastrado, não é possível calcular a margem. Cadastre o custo de cada variante no Loyverse.',
          },
          {
            q: 'O comparativo "vs. período anterior" como funciona?',
            a: 'Para Hoje → compara com ontem. Para 7 dias → compara com os 7 dias anteriores. Para Mês → compara com o mês anterior. O percentual exibido é a variação da Receita Bruta entre os dois períodos.',
          },
          {
            q: 'Os dados são em tempo real?',
            a: 'Os dados refletem a última sincronização com o Loyverse. Use o botão "Sincronizar" na barra superior para forçar uma atualização imediata.',
          },
        ],
      },
      {
        id: 'vendas',
        icon: 'ShoppingCart',
        title: 'Vendas',
        description: 'Lista completa de todos os cupons emitidos no período. Permite visualizar cada transação com seus itens, formas de pagamento e funcionário responsável.',
        what: [
          { term: 'Venda', def: 'Cupom do tipo SALE — transação de saída de produtos.' },
          { term: 'Estorno', def: 'Cupom do tipo REFUND — devolução de uma venda anterior. Reduz a receita do período.' },
          { term: 'Total', def: 'Valor pago pelo cliente naquele cupom, já com descontos aplicados.' },
          { term: 'Forma de pagamento', def: 'Método utilizado. Se o pagamento foi dividido (ex: parte em dinheiro e parte em cartão), aparece o principal + "(+1)".' },
          { term: 'Itens', def: 'Quantidade de linhas de produto no cupom. Ao clicar na linha, expande para mostrar cada item, quantidade, valor e todas as formas de pagamento se houver mais de uma.' },
        ],
        faqs: [
          {
            q: 'Por que uma venda aparece como "—" na coluna de pagamento?',
            a: 'O recibo não possui nenhum pagamento associado (pode ter sido um cupom de teste ou erro de sincronização). Verifique no Loyverse.',
          },
          {
            q: 'Como configurar novas formas de pagamento?',
            a: 'No Loyverse, acesse Configurações → Formas de pagamento → Adicionar. O sistema importa automaticamente todas as formas configuradas.',
          },
          {
            q: 'As devoluções (estornos) são descontadas da receita?',
            a: 'Sim. No DRE, as devoluções aparecem como linha "(-) Devoluções/Estornos" deduzida da Receita Bruta. No Dashboard, são exibidas separadamente no Resumo Financeiro.',
          },
          {
            q: 'Posso filtrar por funcionário?',
            a: 'Atualmente a lista mostra o funcionário em cada linha mas não há filtro por funcionário. O filtro disponível é por período (hoje, ontem, 7 dias, mês ou período customizado).',
          },
        ],
      },
      {
        id: 'caixa',
        icon: 'Wallet',
        title: 'Fluxo de Caixa',
        description: 'Controle de turnos de caixa — abertura, fechamento, sangrias e diferenças de contagem. Foca exclusivamente no dinheiro físico em caixa, não em todas as formas de pagamento.',
        what: [
          { term: 'Turno', def: 'Período de operação de um caixa, do momento que o operador abre até fechar. Um dia pode ter múltiplos turnos (ex: troca de funcionário).' },
          { term: 'Fundo inicial', def: 'Valor em dinheiro colocado no caixa ao abrir o turno (troco inicial).' },
          { term: 'Esperado', def: 'Quanto o sistema calcula que deveria ter em dinheiro: fundo inicial + vendas em dinheiro + suprimentos − sangrias − devoluções em dinheiro.' },
          { term: 'Contado', def: 'Valor físico em dinheiro contado pelo operador ao fechar o turno.' },
          { term: 'Diferença', def: 'Contado − Esperado. Zero = caixa bateu. Positivo (amarelo) = sobrou dinheiro. Negativo (vermelho) = faltou dinheiro.' },
          { term: 'Sangrias', def: 'Retiradas de dinheiro durante o turno (ex: depósito bancário intradía).' },
          { term: 'Receita líquida', def: 'Total de vendas do turno em todas as formas de pagamento.' },
          { term: 'Entradas em caixa', def: 'Soma dos pagamentos em dinheiro (cash) recebidos no período — não inclui cartão, Pix ou voucher.' },
        ],
        faqs: [
          {
            q: 'Por que não aparecem turnos no período?',
            a: 'O operador não abriu turno no aplicativo do Loyverse antes de iniciar as vendas. No app Loyverse (celular ou tablet), o operador deve tocar em "Abrir Caixa" antes de começar a vender.',
          },
          {
            q: 'Como registrar sangria (retirada de dinheiro) no Loyverse?',
            a: 'Durante o turno aberto, acesse o menu do caixa no app Loyverse → Operações de caixa → Retirada. Informe o valor e confirme. A sangria será sincronizada automaticamente.',
          },
          {
            q: 'Como registrar suprimento (entrada de dinheiro) no Loyverse?',
            a: 'Mesmo caminho da sangria: menu do caixa → Operações de caixa → Suprimento. Utilizado quando o fundo de troco precisa ser reforçado durante o turno.',
          },
          {
            q: 'Diferença positiva é bom ou ruim?',
            a: 'Não é necessariamente bom. Diferença positiva (sobra) pode indicar venda não registrada, erro de troco ou descuido no fechamento. O ideal é sempre diferença zero. Por isso a cor é amarela (atenção), não verde.',
          },
          {
            q: 'O operador precisa contar o dinheiro ao fechar?',
            a: 'Sim. No app Loyverse, ao fechar o turno, o sistema pergunta o valor contado em caixa. Esse valor é o "Contado" exibido na tabela. Sem essa contagem, a coluna aparecerá como "—" e o status ficará "Aberto".',
          },
          {
            q: 'Por que "Entradas em caixa" é diferente de "Receita líquida"?',
            a: '"Receita líquida" inclui todas as formas de pagamento (cartão, Pix, dinheiro, etc.). "Entradas em caixa" é apenas o dinheiro físico recebido. A diferença representa vendas por meios eletrônicos.',
          },
        ],
      },
      {
        id: 'dre',
        icon: 'FileText',
        title: 'DRE — Demonstrativo de Resultado',
        description: 'Demonstrativo de Resultado do Exercício no padrão contábil brasileiro. Mostra o caminho da receita bruta até o lucro líquido (EBITDA), incluindo custos e despesas operacionais lançadas manualmente.',
        what: [
          { term: '(+) Receita Bruta', def: 'Preço cheio total dos produtos vendidos antes de qualquer desconto.' },
          { term: '(−) Descontos', def: 'Total de descontos concedidos nas vendas do período.' },
          { term: '(−) Devoluções', def: 'Total de estornos/devoluções realizadas no período.' },
          { term: '(−) Impostos', def: 'Impostos embutidos nos preços (ex: ISS para serviços). Para a maioria dos varejistas no Simples Nacional, este campo é zero.' },
          { term: '(=) Receita Líquida', def: 'Receita Bruta − Descontos − Devoluções − Impostos.' },
          { term: '(−) CMV', def: 'Custo da Mercadoria Vendida — soma dos custos de todos os produtos vendidos. Exige custo cadastrado no Loyverse.' },
          { term: '(=) Lucro Bruto', def: 'Receita Líquida − CMV. Quanto sobra depois de pagar o custo do produto.' },
          { term: 'Margem Bruta %', def: 'Lucro Bruto ÷ Receita Líquida × 100.' },
          { term: '(−) Despesas Operacionais', def: 'Aluguel, salários, energia, etc. Lançados manualmente nesta tela (não vêm do Loyverse).' },
          { term: '(=) EBITDA / Lucro Líquido', def: 'Lucro Bruto − Despesas Operacionais. Resultado operacional do período.' },
        ],
        faqs: [
          {
            q: 'Como lançar uma despesa operacional?',
            a: 'Na seção "Despesas", clique em "+ Lançar". Preencha a categoria (aluguel, salários, energia ou outros), descrição, valor e data de referência. O lançamento é imediato e já reflete no EBITDA.',
          },
          {
            q: 'Por que o CMV está zerado no DRE?',
            a: 'O custo dos produtos não está cadastrado no Loyverse. Acesse Produtos → selecione o item → edite cada variante → preencha o campo "Custo". Sem esse dado, o CMV e a Margem Bruta não podem ser calculados.',
          },
          {
            q: 'Despesas lançadas aqui aparecem no Dashboard?',
            a: 'Não. O Dashboard exibe apenas dados do Loyverse (receitas, custos de produto). As despesas operacionais do DRE são lançamentos manuais e aparecem apenas no demonstrativo.',
          },
          {
            q: 'O que é EBITDA neste contexto?',
            a: 'EBITDA aqui representa o resultado operacional simplificado: Lucro Bruto − Despesas Operacionais. Não considera depreciação, amortização ou impostos sobre o lucro (IR/CSLL), que são categorias mais avançadas de contabilidade.',
          },
          {
            q: 'Qual a diferença entre Margem Bruta e Margem Líquida?',
            a: 'Margem Bruta = Lucro Bruto ÷ Receita Líquida (desconsidera despesas operacionais). Margem Líquida = EBITDA ÷ Receita Líquida (desconsidera também aluguel, salários, etc.). A margem líquida é o indicador mais completo da rentabilidade.',
          },
        ],
      },
      {
        id: 'estoque',
        icon: 'Package',
        title: 'Estoque',
        description: 'Painel de nível de estoque por variante de produto. Exibe apenas os produtos com rastreamento de estoque habilitado no Loyverse.',
        what: [
          { term: 'Em estoque', def: 'Quantidade atual disponível para venda.' },
          { term: 'Mínimo', def: 'Nível mínimo configurado. Abaixo deste valor, o produto aparece como "Estoque baixo".' },
          { term: 'Status OK', def: 'Quantidade ≥ mínimo configurado.' },
          { term: 'Status Estoque baixo', def: 'Quantidade > 0 mas abaixo do mínimo.' },
          { term: 'Status Sem estoque', def: 'Quantidade = 0 ou negativa.' },
          { term: 'Status Não rastreado', def: 'Produto com rastreamento desabilitado no Loyverse.' },
        ],
        faqs: [
          {
            q: 'Por que meu produto não aparece com quantidade de estoque?',
            a: 'O rastreamento de estoque precisa ser habilitado no Loyverse. Acesse Produtos → selecione o item → ative a opção "Rastrear estoque". A sincronização trará os níveis de estoque a partir desse momento.',
          },
          {
            q: 'Como configurar o estoque mínimo (ponto de pedido)?',
            a: 'No Loyverse, acesse Produtos → selecione o item → Inventário → escolha a loja → preencha o campo "Estoque mínimo". Esse valor define o limiar que ativa o alerta de estoque baixo.',
          },
          {
            q: 'O estoque atualiza automaticamente com as vendas?',
            a: 'Sim. Cada venda registrada no Loyverse decrementa o estoque das variantes vendidas. O sistema sincroniza esse dado e exibe sempre o nível atualizado.',
          },
          {
            q: 'Estoque negativo é possível?',
            a: 'Sim, se o Loyverse estiver configurado para permitir vendas mesmo sem estoque. Isso pode acontecer se o produto for vendido antes de o estoque ser cadastrado corretamente ou se houver divergência de inventário físico.',
          },
        ],
      },
    ],
  },

  en: {
    title: 'Help & Documentation',
    subtitle: 'Understand each section of the system and how to correctly configure Loyverse to get the best results.',
    loyverseNote: 'Loyverse POS Integration',
    loyverseDesc: 'All financial data displayed in this system is automatically synced from your Loyverse POS. For accurate numbers, it is essential that operations in Loyverse follow the best practices described in each section below.',
    sections: [
      {
        id: 'dashboard',
        icon: 'LayoutDashboard',
        title: 'Overview (Dashboard)',
        description: 'Main panel with consolidated financial indicators for the selected period. This is the starting point for understanding the financial health of the business in real time.',
        what: [
          { term: 'Gross Revenue', def: 'Total billed at full product price, before any discount. Example: sold 10 coffees at $10.00 = Gross Revenue $100.00.' },
          { term: 'Sales Count', def: 'Number of receipts issued in the period. Each receipt = one transaction, regardless of how many items it contains.' },
          { term: 'Avg. Ticket', def: 'Revenue (after discounts) divided by number of sales. Measures the average value of each purchase.' },
          { term: 'Gross Margin', def: 'Gross profit percentage over net revenue: (Net Rev. − COGS) ÷ Net Rev. × 100. Only calculated if product cost is registered.' },
          { term: 'Net Revenue', def: 'Revenue after discounts minus taxes embedded in prices.' },
          { term: 'COGS (Cost of Goods Sold)', def: 'Sum of costs of all products sold. Depends on cost registration per variant in Loyverse.' },
          { term: 'Gross Profit', def: 'Net Revenue minus COGS.' },
          { term: 'Hourly chart', def: 'Revenue distributed by hour of day, grouped in the America/São Paulo timezone.' },
          { term: 'Payment methods', def: 'Distribution of sales by payment type (cash, card, Pix, etc.).' },
        ],
        faqs: [
          {
            q: 'Why does COGS appear as zero or very low?',
            a: 'Product cost is not registered in Loyverse. Go to Products → select the item → edit each variant → fill in the "Cost" field. After saving and syncing, future sales will reflect the COGS.',
          },
          {
            q: 'Why is Gross Margin at 0%?',
            a: 'Same cause as zero COGS. Without registered cost, margin cannot be calculated. Register the cost of each variant in Loyverse.',
          },
          {
            q: 'How does the "vs. previous period" comparison work?',
            a: 'For Today → compares with yesterday. For 7 days → compares with the previous 7 days. For Month → compares with the previous month. The percentage shown is the variation in Gross Revenue between the two periods.',
          },
          {
            q: 'Is the data real-time?',
            a: 'Data reflects the last sync with Loyverse. Use the "Sync" button in the top bar to force an immediate update.',
          },
        ],
      },
      {
        id: 'vendas',
        icon: 'ShoppingCart',
        title: 'Sales',
        description: 'Complete list of all receipts issued in the period. Allows viewing each transaction with its items, payment methods and responsible employee.',
        what: [
          { term: 'Sale', def: 'SALE type receipt — product outflow transaction.' },
          { term: 'Refund', def: 'REFUND type receipt — return of a previous sale. Reduces revenue for the period.' },
          { term: 'Total', def: 'Amount paid by the customer on that receipt, already with discounts applied.' },
          { term: 'Payment method', def: 'Method used. If payment was split (e.g., part cash and part card), the main method appears + "(+1)".' },
          { term: 'Items', def: 'Number of product lines on the receipt. Click the row to expand and see each item, quantity, price and all payment methods.' },
        ],
        faqs: [
          {
            q: 'Why does a sale show "—" in the payment column?',
            a: 'The receipt has no associated payment (may be a test receipt or sync error). Check in Loyverse.',
          },
          {
            q: 'How to configure new payment methods?',
            a: 'In Loyverse, go to Settings → Payment Methods → Add. The system automatically imports all configured payment methods.',
          },
          {
            q: 'Are returns (refunds) deducted from revenue?',
            a: 'Yes. In the DRE, returns appear as a "(-) Returns/Refunds" line deducted from Gross Revenue. In the Dashboard, they are shown separately in the Financial Summary.',
          },
        ],
      },
      {
        id: 'caixa',
        icon: 'Wallet',
        title: 'Cash Flow',
        description: 'Cash register shift control — opening, closing, cash outs and counting differences. Focuses exclusively on physical cash in the register, not all payment methods.',
        what: [
          { term: 'Shift', def: 'Operating period of a register, from when the operator opens until closing. A day may have multiple shifts (e.g., employee change).' },
          { term: 'Opening Float', def: 'Cash amount placed in the register when opening the shift (initial change).' },
          { term: 'Expected', def: 'How much the system calculates should be in cash: opening float + cash sales + cash in − cash out − cash refunds.' },
          { term: 'Counted', def: 'Physical cash amount counted by the operator when closing the shift.' },
          { term: 'Difference', def: 'Counted − Expected. Zero = balanced. Positive (yellow) = excess cash. Negative (red) = cash shortage.' },
          { term: 'Cash Out', def: 'Cash withdrawals during the shift (e.g., intraday bank deposit).' },
          { term: 'Net Revenue', def: 'Total sales for the shift across all payment methods.' },
          { term: 'Cash Inflows', def: 'Sum of cash payments received in the period — excludes card, Pix or voucher.' },
        ],
        faqs: [
          {
            q: 'Why are no shifts appearing in the period?',
            a: 'The operator did not open a shift in the Loyverse app before starting sales. In the Loyverse app (mobile or tablet), the operator must tap "Open Register" before starting to sell.',
          },
          {
            q: 'How to register a cash out (withdrawal) in Loyverse?',
            a: 'During the open shift, access the register menu in the Loyverse app → Register Operations → Withdrawal. Enter the amount and confirm. The withdrawal will be automatically synced.',
          },
          {
            q: 'Is a positive difference good or bad?',
            a: 'Not necessarily good. Positive difference (excess) may indicate an unregistered sale, change error or carelessness in closing. The ideal is always zero difference. That is why the color is yellow (caution), not green.',
          },
          {
            q: 'Why is "Cash Inflows" different from "Net Revenue"?',
            a: '"Net Revenue" includes all payment methods (card, Pix, cash, etc.). "Cash Inflows" is only physical cash received. The difference represents electronic payment sales.',
          },
        ],
      },
      {
        id: 'dre',
        icon: 'FileText',
        title: 'DRE — Income Statement',
        description: 'Income Statement following Brazilian accounting standards. Shows the path from gross revenue to net profit (EBITDA), including costs and manually entered operating expenses.',
        what: [
          { term: '(+) Gross Revenue', def: 'Total full-price value of products sold before any discount.' },
          { term: '(−) Discounts', def: 'Total discounts granted on sales in the period.' },
          { term: '(−) Refunds', def: 'Total returns/refunds made in the period.' },
          { term: '(−) Taxes', def: 'Taxes embedded in prices. For most retailers under simplified tax regimes, this field is zero.' },
          { term: '(=) Net Revenue', def: 'Gross Revenue − Discounts − Refunds − Taxes.' },
          { term: '(−) COGS', def: 'Cost of Goods Sold — sum of costs of all products sold. Requires cost registered in Loyverse.' },
          { term: '(=) Gross Profit', def: 'Net Revenue − COGS. What remains after paying product cost.' },
          { term: 'Gross Margin %', def: 'Gross Profit ÷ Net Revenue × 100.' },
          { term: '(−) Operating Expenses', def: 'Rent, salaries, utilities, etc. Entered manually on this screen (not from Loyverse).' },
          { term: '(=) EBITDA / Net Profit', def: 'Gross Profit − Operating Expenses. Operating result for the period.' },
        ],
        faqs: [
          {
            q: 'How to enter an operating expense?',
            a: 'In the "Expenses" section, click "+ Add". Fill in the category (rent, salaries, utilities or other), description, amount and reference date. The entry is immediate and already reflects in EBITDA.',
          },
          {
            q: 'Why is COGS zero in the DRE?',
            a: 'Product cost is not registered in Loyverse. Go to Products → select the item → edit each variant → fill in the "Cost" field. Without this data, COGS and Gross Margin cannot be calculated.',
          },
          {
            q: 'What is EBITDA in this context?',
            a: 'EBITDA here represents the simplified operating result: Gross Profit − Operating Expenses. It does not consider depreciation, amortization or income taxes, which are more advanced accounting categories.',
          },
        ],
      },
      {
        id: 'estoque',
        icon: 'Package',
        title: 'Inventory',
        description: 'Stock level panel by product variant. Only displays products with inventory tracking enabled in Loyverse.',
        what: [
          { term: 'In Stock', def: 'Current quantity available for sale.' },
          { term: 'Minimum', def: 'Configured minimum level. Below this value, the product appears as "Low Stock".' },
          { term: 'Status OK', def: 'Quantity ≥ configured minimum.' },
          { term: 'Status Low Stock', def: 'Quantity > 0 but below minimum.' },
          { term: 'Status Out of Stock', def: 'Quantity = 0 or negative.' },
          { term: 'Status Untracked', def: 'Product with tracking disabled in Loyverse.' },
        ],
        faqs: [
          {
            q: 'Why does my product not show a stock quantity?',
            a: 'Inventory tracking must be enabled in Loyverse. Go to Products → select the item → enable "Track Inventory". The sync will bring stock levels from that point on.',
          },
          {
            q: 'How to configure minimum stock (reorder point)?',
            a: 'In Loyverse, go to Products → select the item → Inventory → choose the store → fill in the "Low stock" field. This value defines the threshold that triggers the low stock alert.',
          },
          {
            q: 'Does stock update automatically with sales?',
            a: 'Yes. Each sale registered in Loyverse decrements the stock of the sold variants. The system syncs this data and always displays the updated level.',
          },
        ],
      },
    ],
  },
};

// ── Componentes ───────────────────────────────────────────────────────────────

const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  FileText,
  Package,
};

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-3 py-3 text-left transition-colors hover:text-foreground"
      >
        <span className="text-sm font-medium text-foreground">{q}</span>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        }
      </button>
      {open && (
        <p className="pb-3 text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
}

function SectionCard({ section }: { section: typeof content.pt.sections[number] }) {
  const Icon = ICONS[section.icon] ?? HelpCircle;
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="rounded-lg border border-border bg-card p-5 shadow-sm ring-0 transition-shadow duration-200 hover:shadow-md overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-4 text-left"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-muted shrink-0">
            <Icon className="h-[18px] w-[18px] text-brand" />
          </div>
          <div>
            <p className="card-title">{section.title}</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{section.description}</p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
          : <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
        }
      </button>

      {expanded && (
        <div className="mt-5 space-y-6 border-t border-border/60 pt-5">
          {/* Glossário */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              O que cada indicador significa
            </p>
            <div className="divide-y divide-border/60">
              {section.what.map((item) => (
                <div key={item.term} className="flex gap-2 text-sm py-2 first:pt-0 last:pb-0">
                  <span className="font-medium text-foreground shrink-0">{item.term}:</span>
                  <span className="text-muted-foreground">{item.def}</span>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Perguntas frequentes
            </p>
            <div className="divide-y divide-border/60">
              {section.faqs.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AjudaPage() {
  const { lang } = useSettings();
  const c = content[lang] ?? content.pt;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{c.title}</h1>
        <p className="text-sm text-muted-foreground">{c.subtitle}</p>
      </div>

      {/* Nota sobre Loyverse */}
      <Card className="rounded-lg border border-brand/20 bg-brand/5 p-5 shadow-sm ring-0">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-muted shrink-0">
            <HelpCircle className="h-[18px] w-[18px] text-brand" />
          </div>
          <div>
            <p className="card-title">{c.loyverseNote}</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{c.loyverseDesc}</p>
          </div>
        </div>
      </Card>

      {/* Seções */}
      <div className="space-y-4">
        {c.sections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
