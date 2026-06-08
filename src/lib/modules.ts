export type ModuleKey =
  | "dashboard"
  | "clients"
  | "patients"
  | "queue"
  | "prontuarios"
  | "users"
  | "profiles"
  | "reports"
  | "products"
  | "stock_movements"
  | "stock_reports";

export type ModuleDef = {
  key: ModuleKey;
  label: string;
  group: string;
  to: string;
};

export const MODULES: ModuleDef[] = [
  { key: "dashboard", label: "Início", group: "Geral", to: "/dashboard" },
  { key: "clients", label: "Clientes", group: "Recepção", to: "/clients" },
  { key: "patients", label: "Pacientes", group: "Recepção", to: "/patients" },
  { key: "queue", label: "Fila de Chamada", group: "Atendimento", to: "/queue" },
  { key: "prontuarios", label: "Prontuários", group: "Atendimento", to: "/prontuarios" },
  { key: "users", label: "Usuários", group: "Gestão", to: "/users" },
  { key: "profiles", label: "Perfis de Acesso", group: "Gestão", to: "/profiles" },
  { key: "reports", label: "Relatórios", group: "Gestão", to: "/reports" },
  { key: "products", label: "Produtos", group: "Estoque", to: "/products" },
  { key: "stock_movements", label: "Entradas / Saídas", group: "Estoque", to: "/stock/movements" },
  { key: "stock_reports", label: "Relatórios de Estoque", group: "Estoque", to: "/stock/reports" },
];

export const MODULES_BY_GROUP = MODULES.reduce<Record<string, ModuleDef[]>>((acc, m) => {
  (acc[m.group] ||= []).push(m);
  return acc;
}, {});
