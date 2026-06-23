import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  DollarSign,
  Package,
  History,
  Printer,
  User,
  Sparkles,
  Percent,
  Settings,
} from "lucide-react";
import { printCupomFiscal, type CupomFiscalData } from "@/lib/print-docs";

export const Route = createFileRoute("/_authenticated/pdv")({ component: PDVPage });

interface Product {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  unit: string | null;
  stock: number;
  min_stock: number;
  price: number;
  description: string | null;
  active: boolean;
}

interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  unit: string | null;
  sku: string | null;
}

function PDVPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("pdv");

  // Clinic receipt header settings
  const [clinicSettings, setClinicSettings] = useState({
    name: "VETTECH CLINICA VETERINARIA LTDA",
    cnpj: "12.345.678/0001-90",
    ie: "123.456.789.110",
    address: "RUA DAS FLORES, 123 - CENTRO",
  });
  const [tempSettings, setTempSettings] = useState(clinicSettings);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("vettech_pdv_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setClinicSettings(parsed);
        setTempSettings(parsed);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem("vettech_pdv_settings", JSON.stringify(tempSettings));
    setClinicSettings(tempSettings);
    setShowSettingsDialog(false);
    toast.success("Configurações do cupom salvas com sucesso!");
  };

  // Core state for Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [amountPaid, setAmountPaid] = useState<string>("");

  // Search state
  const [searchProduct, setSearchProduct] = useState("");
  const [searchClient, setSearchClient] = useState("");

  // Dialog for finalizing sale / change info
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [completedSaleData, setCompletedSaleData] = useState<CupomFiscalData | null>(null);

  // Queries
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, document, phone")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  // Sales History Query (grouping stock movements by invoice_number)
  const { data: rawMovements = [], isLoading: isLoadingSales } = useQuery({
    queryKey: ["pdv-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*, products(name, unit)")
        .like("invoice_number", "PDV-%")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Reconstruct sales from stock movements grouped by invoice_number
  const salesHistory = useMemo(() => {
    const groups: Record<string, any> = {};

    rawMovements.forEach((m: any) => {
      const saleId = m.invoice_number;
      if (!saleId) return;

      let meta: any = {};
      try {
        if (m.notes) meta = JSON.parse(m.notes);
      } catch (e) {
        meta = {
          client_name: "Consumidor Padrão",
          payment_method: "dinheiro",
          discount_applied: 0,
          total_sale: m.unit_cost ? m.unit_cost * m.quantity : 0,
        };
      }

      if (!groups[saleId]) {
        groups[saleId] = {
          id: saleId,
          date: m.created_at,
          clientName: meta.client_name || "Consumidor Padrão",
          clientDocument: meta.client_document || "",
          paymentMethod: meta.payment_method || "dinheiro",
          discount: meta.discount_applied || 0,
          subtotal: meta.subtotal || 0,
          total: meta.total_sale || 0,
          items: [],
        };
      }

      groups[saleId].items.push({
        product_id: m.product_id,
        name: m.products?.name || meta.item_name || "Produto",
        quantity: m.quantity,
        price: m.unit_cost || meta.item_price || 0,
        total: (m.unit_cost || meta.item_price || 0) * m.quantity,
        unit: m.products?.unit || null,
      });
    });

    return Object.values(groups).sort(
      (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [rawMovements]);

  // Filters for client & product
  const filteredProducts = useMemo(() => {
    if (!searchProduct) return products;
    const term = searchProduct.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        p.category.toLowerCase().includes(term),
    );
  }, [products, searchProduct]);

  const filteredClients = useMemo(() => {
    if (!searchClient) return clients;
    const term = searchClient.toLowerCase();
    return clients.filter(
      (c) => c.full_name.toLowerCase().includes(term) || (c.document && c.document.includes(term)),
    );
  }, [clients, searchClient]);

  // Cart operations
  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.product_id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        toast.warning(
          `Quantidade solicitada excede o estoque disponível (${product.stock} ${product.unit || "un"}).`,
        );
      }
      setCart(
        cart.map((item) =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        ),
      );
    } else {
      if (product.stock <= 0) {
        toast.warning(`Produto com estoque esgotado (${product.stock}). Adicionado mesmo assim.`);
      }
      setCart([
        ...cart,
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          stock: product.stock,
          unit: product.unit,
          sku: product.sku,
        },
      ]);
    }
    toast.success(`${product.name} adicionado ao carrinho.`);
  };

  const updateQuantity = (productId: string, val: number) => {
    const item = cart.find((i) => i.product_id === productId);
    if (!item) return;
    const newQty = item.quantity + val;
    if (newQty <= 0) {
      setCart(cart.filter((i) => i.product_id !== productId));
    } else {
      if (newQty > item.stock) {
        toast.warning(
          `Quantidade excede o estoque disponível (${item.stock} ${item.unit || "un"}).`,
        );
      }
      setCart(cart.map((i) => (i.product_id === productId ? { ...i, quantity: newQty } : i)));
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((i) => i.product_id !== productId));
  };

  // Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartTotal = Math.max(0, cartSubtotal - discount);
  const changeValue = useMemo(() => {
    if (paymentMethod !== "dinheiro" || !amountPaid) return 0;
    const paid = Number(amountPaid.replace(",", "."));
    return Math.max(0, paid - cartTotal);
  }, [amountPaid, cartTotal, paymentMethod]);

  // Mutation for Checkout
  const checkout = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error("Adicione produtos ao carrinho antes de finalizar!");
      if (
        paymentMethod === "dinheiro" &&
        (!amountPaid || Number(amountPaid.replace(",", ".")) < cartTotal)
      ) {
        throw new Error("Valor pago em dinheiro é insuficiente!");
      }

      const saleId = `PDV-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
      const selectedClient = clients.find((c) => c.id === selectedClientId);

      // Record each item in stock_movements as a sale output
      const promises = cart.map((item) => {
        const itemNotes = {
          is_pdv: true,
          sale_id: saleId,
          client_id: selectedClientId || null,
          client_name: selectedClient ? selectedClient.full_name : "Consumidor Padrão",
          client_document: selectedClient ? selectedClient.document : null,
          payment_method: paymentMethod,
          discount_applied: discount,
          subtotal: cartSubtotal,
          total_sale: cartTotal,
          item_name: item.name,
          item_price: item.price,
          item_quantity: item.quantity,
        };

        return supabase.from("stock_movements").insert({
          product_id: item.product_id,
          kind: "out",
          quantity: item.quantity,
          unit_cost: item.price,
          invoice_number: saleId,
          notes: JSON.stringify(itemNotes),
          created_by: user?.id || null,
        });
      });

      const results = await Promise.all(promises);
      for (const r of results) {
        if (r.error) throw r.error;
      }

      return {
        id: saleId,
        date: new Date().toISOString(),
        clientName: selectedClient ? selectedClient.full_name : "Consumidor Padrão",
        clientDocument: selectedClient ? selectedClient.document : null,
        items: cart.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
          unit: item.unit,
        })),
        subtotal: cartSubtotal,
        discount: discount,
        total: cartTotal,
        paymentMethod: paymentMethod,
        amountPaid: paymentMethod === "dinheiro" ? Number(amountPaid.replace(",", ".")) : cartTotal,
        change: paymentMethod === "dinheiro" ? changeValue : 0,
        clinicName: clinicSettings.name,
        clinicCnpj: clinicSettings.cnpj,
        clinicIe: clinicSettings.ie,
        clinicAddress: clinicSettings.address,
      };
    },
    onSuccess: (data) => {
      setCompletedSaleData(data);
      setShowInvoiceDialog(true);
      // Auto trigger printing
      printCupomFiscal(data);

      // Reset PDV state
      setCart([]);
      setDiscount(0);
      setAmountPaid("");
      setSelectedClientId("");
      setSearchProduct("");

      // Refresh queries
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["pdv-sales"] });
    },
    onError: (e: any) => {
      toast.error(e?.message || "Erro ao concluir a venda.");
    },
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" /> Módulo de Vendas (PDV)
          </h1>
          <p className="text-sm text-muted-foreground">
            Checkout rápido de produtos com emissão de Cupom Fiscal.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setTempSettings(clinicSettings);
            setShowSettingsDialog(true);
          }}
          className="flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Configurar Recibo
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="pdv" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" /> Frente de Caixa
          </TabsTrigger>
          <TabsTrigger value="estoque" className="flex items-center gap-2">
            <Package className="w-4 h-4" /> Consultar Estoque
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <History className="w-4 h-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        {/* 1. PDV TAB */}
        <TabsContent value="pdv" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT: Product Selection & Cart */}
            <div className="lg:col-span-7 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Adicionar Produtos</span>
                    <Badge variant="outline" className="font-normal text-xs">
                      {filteredProducts.length} itens ativos
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar por nome ou SKU..."
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {searchProduct && (
                    <div className="border rounded-md max-h-[180px] overflow-y-auto divide-y bg-popover text-popover-foreground shadow-sm">
                      {filteredProducts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            addToCart(p);
                          }}
                          className="flex items-center justify-between p-3 hover:bg-accent cursor-pointer transition text-sm"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="font-semibold truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground">
                              SKU: {p.sku || "—"} • Categoria:{" "}
                              <span className="capitalize">{p.category}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-3">
                            <span className="font-bold text-primary">
                              R$ {Number(p.price).toFixed(2)}
                            </span>
                            <Badge variant={p.stock <= p.min_stock ? "destructive" : "secondary"}>
                              Estoque: {p.stock}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {filteredProducts.length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Nenhum produto correspondente.
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* CART ITEMS CONTAINER */}
              <Card className="min-h-[300px]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-primary" /> Carrinho de Vendas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right">Unitário</TableHead>
                          <TableHead className="text-center">Qtd</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cart.map((item) => (
                          <TableRow key={item.product_id}>
                            <TableCell className="font-medium max-w-[150px] truncate">
                              <div>{item.name}</div>
                              {item.sku && (
                                <span className="text-[10px] text-muted-foreground">
                                  SKU: {item.sku}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">R$ {item.price.toFixed(2)}</TableCell>
                            <TableCell className="text-center">
                              <div className="inline-flex items-center gap-1.5 border rounded-md px-1.5 py-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => updateQuantity(item.product_id, -1)}
                                  className="h-6 w-6 rounded-full"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <span className="text-sm font-semibold w-6 text-center">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => updateQuantity(item.product_id, 1)}
                                  className="h-6 w-6 rounded-full"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              R$ {(item.price * item.quantity).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFromCart(item.product_id)}
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {cart.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center py-12 text-muted-foreground text-sm"
                            >
                              Carrinho vazio. Busque e adicione produtos acima.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT: Customer Selection & Financial Details */}
            <div className="lg:col-span-5 space-y-4">
              {/* CLIENT SELECT CARD */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Identificar Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Buscar Cliente Cadastrado (Opcional)</Label>
                    <div className="relative mt-1">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                      <Input
                        placeholder="Nome ou CPF..."
                        value={searchClient}
                        onChange={(e) => setSearchClient(e.target.value)}
                        className="pl-8 text-xs"
                      />
                    </div>
                  </div>

                  {searchClient && (
                    <div className="border rounded-md max-h-[140px] overflow-y-auto divide-y bg-popover text-popover-foreground text-xs shadow-sm">
                      <div
                        onClick={() => {
                          setSelectedClientId("");
                          setSearchClient("");
                        }}
                        className="p-2 hover:bg-accent cursor-pointer transition font-medium text-destructive"
                      >
                        Remover cliente selecionado / Consumidor Padrão
                      </div>
                      {filteredClients.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedClientId(c.id);
                            setSearchClient(c.full_name);
                          }}
                          className={`p-2 hover:bg-accent cursor-pointer transition ${selectedClientId === c.id ? "bg-accent font-semibold" : ""}`}
                        >
                          <div>{c.full_name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            CPF: {c.document || "—"} • Tel: {c.phone || "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-xs">
                    <div className="font-semibold">Cliente Selecionado:</div>
                    <div className="text-primary font-bold">
                      {selectedClientId
                        ? clients.find((c) => c.id === selectedClientId)?.full_name
                        : "Consumidor Padrão"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* PAYMENT DETAILS CARD */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" /> Fechamento e Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Desconto */}
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5" /> Desconto (R$)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discount || ""}
                      onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                      placeholder="Valor do desconto em R$..."
                      className="mt-1"
                    />
                  </div>

                  {/* Forma de Pagamento */}
                  <div>
                    <Label className="text-xs">Forma de Pagamento</Label>
                    <Select
                      value={paymentMethod}
                      onValueChange={(v) => {
                        setPaymentMethod(v);
                        if (v !== "dinheiro") setAmountPaid("");
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                        <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                        <SelectItem value="dinheiro">Dinheiro em Espécie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Valor Pago (Dinheiro) */}
                  {paymentMethod === "dinheiro" && (
                    <div className="space-y-2 border-t pt-3 mt-3 animate-in fade-in duration-300">
                      <div>
                        <Label className="text-xs text-primary font-semibold">
                          Valor Recebido R$ *
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(e.target.value)}
                          placeholder="Ex: 50.00"
                          className="mt-1 border-primary"
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm font-semibold bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-200">
                        <span>Troco a devolver:</span>
                        <span className="text-base font-bold">R$ {changeValue.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* RESUMO VALORES */}
                  <div className="border-t pt-4 space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>R$ {cartSubtotal.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>Desconto</span>
                        <span>- R$ {discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-lg font-bold border-t pt-2 text-foreground">
                      <span>Total Venda</span>
                      <span className="text-2xl text-primary">R$ {cartTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* BTN COMPLETAR */}
                  <Button
                    className="w-full text-base font-semibold py-6 mt-2"
                    disabled={cart.length === 0 || checkout.isPending}
                    onClick={() => checkout.mutate()}
                  >
                    {checkout.isPending ? "Processando venda..." : "Finalizar Venda & Emitir Cupom"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 2. ESTOQUE TAB */}
        <TabsContent value="estoque" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Consultar Estoque Integrado</CardTitle>
              <CardDescription>
                Consulte quantidades, SKUs e valores dos produtos cadastrados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar produto pelo nome, SKU ou categoria..."
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Preço Unitário</TableHead>
                      <TableHead className="text-center">Estoque Atual</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((p) => {
                      const lowStock = p.stock <= p.min_stock;
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-semibold">{p.name}</TableCell>
                          <TableCell>{p.sku || "—"}</TableCell>
                          <TableCell className="capitalize">
                            <Badge variant="outline">{p.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            R$ {Number(p.price).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`font-semibold ${lowStock ? "text-destructive font-bold" : "text-foreground"}`}
                            >
                              {p.stock} {p.unit || "un"}
                            </span>
                            {lowStock && (
                              <Badge variant="destructive" className="ml-2 text-[10px] py-0 px-1.5">
                                Mín: {p.min_stock}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => {
                                addToCart(p);
                                setActiveTab("pdv");
                              }}
                            >
                              Adicionar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredProducts.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-12 text-muted-foreground text-sm"
                        >
                          Nenhum produto ativo cadastrado ou correspondente à busca.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. HISTORICO TAB */}
        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Vendas PDV</CardTitle>
              <CardDescription>
                Consulte extratos fiscais e faturamentos de vendas recentes realizadas na clínica.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSales ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Carregando histórico de vendas...
                </div>
              ) : (
                <div className="space-y-4">
                  {salesHistory.map((sale: any) => (
                    <Card key={sale.id} className="border hover:border-primary/50 transition">
                      <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-primary">{sale.id}</span>
                            <Badge className="text-[10px] uppercase font-bold" variant="secondary">
                              {sale.paymentMethod.replace("_", " ")}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Data: <strong>{new Date(sale.date).toLocaleString("pt-BR")}</strong> •
                            Cliente: <strong>{sale.clientName}</strong>
                          </div>
                          <div className="text-xs text-muted-foreground max-w-md truncate">
                            Itens:{" "}
                            {sale.items.map((it: any) => `${it.name} (${it.quantity}x)`).join(", ")}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Total da Venda</div>
                            <div className="font-extrabold text-lg text-primary">
                              R$ {sale.total.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              title="Reimprimir Cupom"
                              onClick={() => printCupomFiscal(sale)}
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {salesHistory.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      Nenhuma venda PDV registrada no histórico.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* FINALIZED SALE RECEIPT INFO DIALOG */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <Sparkles className="w-5 h-5 text-emerald-500" /> Venda Concluída com Sucesso!
            </DialogTitle>
          </DialogHeader>
          {completedSaleData && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                A venda foi concluída no sistema com baixa de estoque realizada e o cupom fiscal
                térmico foi gerado.
              </p>

              <div className="bg-muted p-4 rounded-lg space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">
                    Identificador da Venda:
                  </span>
                  <span className="font-bold text-foreground">{completedSaleData.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Cliente / Tutor:</span>
                  <span className="font-bold text-foreground">{completedSaleData.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Total Líquido:</span>
                  <span className="font-bold text-primary text-sm">
                    R$ {completedSaleData.total.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Forma de Pagamento:</span>
                  <span className="font-bold text-foreground capitalize">
                    {completedSaleData.paymentMethod.replace("_", " ")}
                  </span>
                </div>
                {completedSaleData.paymentMethod === "dinheiro" && (
                  <>
                    <div className="flex justify-between">
                      <span className="font-semibold text-muted-foreground">Valor Recebido:</span>
                      <span className="font-bold text-foreground">
                        R$ {completedSaleData.amountPaid.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold bg-emerald-100/50 p-1.5 rounded">
                      <span>Troco:</span>
                      <span>R$ {completedSaleData.change.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => printCupomFiscal(completedSaleData)}>
                  <Printer className="w-4 h-4 mr-2" /> Imprimir Cupom
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowInvoiceDialog(false)}
                >
                  Fechar Janela
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* SETTINGS DIALOG — Configurações do Cupom Fiscal */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" /> Configurações do Cupom Fiscal
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Edite as informações da sua clínica que serão impressas no cabeçalho do cupom fiscal.
              As configurações são salvas localmente no navegador.
            </p>

            <div className="space-y-3">
              {/* Nome da Clínica */}
              <div className="space-y-1">
                <Label htmlFor="settings-clinic-name" className="text-xs font-semibold">
                  Nome / Razão Social da Clínica
                </Label>
                <Input
                  id="settings-clinic-name"
                  value={tempSettings.name}
                  onChange={(e) =>
                    setTempSettings((prev) => ({ ...prev, name: e.target.value.toUpperCase() }))
                  }
                  placeholder="Ex: VETTECH CLÍNICA VETERINÁRIA LTDA"
                  className="uppercase"
                />
              </div>

              {/* CNPJ */}
              <div className="space-y-1">
                <Label htmlFor="settings-cnpj" className="text-xs font-semibold">
                  CNPJ
                </Label>
                <Input
                  id="settings-cnpj"
                  value={tempSettings.cnpj}
                  onChange={(e) => setTempSettings((prev) => ({ ...prev, cnpj: e.target.value }))}
                  placeholder="Ex: 12.345.678/0001-90"
                  maxLength={18}
                />
                <p className="text-[10px] text-muted-foreground">
                  Formato: 00.000.000/0000-00
                </p>
              </div>

              {/* Inscrição Estadual */}
              <div className="space-y-1">
                <Label htmlFor="settings-ie" className="text-xs font-semibold">
                  Inscrição Estadual (IE)
                </Label>
                <Input
                  id="settings-ie"
                  value={tempSettings.ie}
                  onChange={(e) => setTempSettings((prev) => ({ ...prev, ie: e.target.value }))}
                  placeholder="Ex: 123.456.789.110 ou ISENTO"
                />
              </div>

              {/* Endereço */}
              <div className="space-y-1">
                <Label htmlFor="settings-address" className="text-xs font-semibold">
                  Endereço Completo
                </Label>
                <Input
                  id="settings-address"
                  value={tempSettings.address}
                  onChange={(e) =>
                    setTempSettings((prev) => ({ ...prev, address: e.target.value.toUpperCase() }))
                  }
                  placeholder="Ex: RUA DAS FLORES, 123 - CENTRO - SÃO PAULO/SP"
                  className="uppercase"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-3 bg-muted/50 space-y-0.5 text-center font-mono text-xs">
              <p className="font-bold text-sm">{tempSettings.name || "NOME DA CLÍNICA"}</p>
              <p className="text-muted-foreground">CNPJ: {tempSettings.cnpj || "00.000.000/0000-00"}</p>
              <p className="text-muted-foreground">IE: {tempSettings.ie || "—"}</p>
              <p className="text-muted-foreground">{tempSettings.address || "ENDEREÇO DA CLÍNICA"}</p>
            </div>
          </div>

          <DialogFooter className="gap-2 flex-row">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setTempSettings(clinicSettings);
                setShowSettingsDialog(false);
              }}
            >
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSaveSettings}>
              Salvar Configurações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
