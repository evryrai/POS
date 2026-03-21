<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'

type ProductItem = {
  id: string
  sku: string
  barcode: string | null
  name: string
  sellPrice: number | string
  stockQty: number
}

type CartItem = { id: string; name: string; price: number; qty: number }

type CheckoutResponse = {
  ok: boolean
  invoiceNumber: string
  totalAmount: number
  paidAmount: number
  changeAmount: number
  cartItems?: CartItem[]
}

const query = ref('')
const cart = ref<CartItem[]>([])
const paymentMethod = ref<'CASH' | 'QRIS' | 'E_WALLET' | 'DEBT'>('CASH')
const paidAmount = ref(0)
const discountAmount = ref(0)
const note = ref('')
const selectedCustomerId = ref<string | null>(null)
const checkoutBusy = ref(false)
const checkoutError = ref('')
const checkoutSuccess = ref('')
const lastReceipt = ref<CheckoutResponse | null>(null)

const searchInput = ref<HTMLInputElement | null>(null)

const { data, pending, refresh } = await useFetch('/api/products', {
  query: computed(() => ({ q: query.value, limit: 30, offset: 0 }))
})

const { data: customersData } = await useFetch('/api/customers', {
  query: { limit: 100 }
})

const { data: recentTransactions, refresh: refreshRecent } = await useFetch('/api/transactions/recent')

const items = computed<ProductItem[]>(() => data.value?.items ?? [])
const customers = computed(() => customersData.value?.items ?? [])
const stockMap = computed(() => new Map(items.value.map((p) => [p.id, Number(p.stockQty || 0)])))
const subtotal = computed(() => cart.value.reduce((sum, item) => sum + item.price * item.qty, 0))
const totalAmount = computed(() => Math.max(0, subtotal.value - discountAmount.value))
const changeAmount = computed(() => Math.max(0, paidAmount.value - totalAmount.value))

// Barcode Scanning Logic
watch(data, (newData) => {
  if (newData?.items?.length === 1 && query.value.trim() !== '') {
    const product = newData.items[0]
    if (product.barcode === query.value.trim() || product.sku === query.value.trim()) {
      addToCart(product)
      query.value = '' 
    }
  }
})

function getInCartQty(productId: string) {
  return cart.value.find((item) => item.id === productId)?.qty || 0
}

function addToCart(product: ProductItem) {
  checkoutError.value = ''
  const availableStock = Number(product.stockQty || 0)
  const inCart = getInCartQty(product.id)
  if (inCart >= availableStock) {
    checkoutError.value = `Stock limit reached for ${product.name} (available ${availableStock})`
    return
  }
  const existing = cart.value.find((item) => item.id === product.id)
  if (existing) {
    existing.qty += 1
    return
  }
  cart.value.push({
    id: product.id,
    name: product.name,
    price: Number(product.sellPrice || 0),
    qty: 1
  })
}

function incQty(id: string) {
  const item = cart.value.find((x) => x.id === id)
  if (!item) return
  const availableStock = stockMap.value.get(id) ?? 0
  if (item.qty >= availableStock) {
    checkoutError.value = `Cannot exceed stock (${availableStock}) for ${item.name}`
    return
  }
  checkoutError.value = ''
  item.qty += 1
}

function decQty(id: string) {
  const item = cart.value.find((x) => x.id === id)
  if (!item) return
  item.qty -= 1
  if (item.qty <= 0) {
    cart.value = cart.value.filter((x) => x.id !== id)
  }
}

async function checkout() {
  checkoutError.value = ''
  checkoutSuccess.value = ''
  lastReceipt.value = null

  if (cart.value.length === 0) return
  if (paymentMethod.value === 'DEBT' && !selectedCustomerId.value) {
    checkoutError.value = 'Please select a customer for debt payment'
    return
  }

  checkoutBusy.value = true
  try {
    const res = await $fetch<CheckoutResponse>('/api/checkout', {
      method: 'POST',
      body: {
        items: cart.value.map((x) => ({ productId: x.id, qty: x.qty })),
        paymentMethod: paymentMethod.value,
        paidAmount: paidAmount.value,
        discountAmount: discountAmount.value,
        note: note.value || undefined,
        customerId: selectedCustomerId.value
      }
    })

    checkoutSuccess.value = `Success: ${res.invoiceNumber} · Change Rp ${res.changeAmount.toLocaleString('id-ID')}`
    const finalCartItems = [...cart.value]
    lastReceipt.value = { ...res, cartItems: finalCartItems }
    
    cart.value = []
    paidAmount.value = 0
    discountAmount.value = 0
    note.value = ''
    selectedCustomerId.value = null
    await refresh()
    await refreshRecent()
  } catch (error: any) {
    checkoutError.value = error?.data?.statusMessage || error?.message || 'Checkout failed'
  } finally {
    checkoutBusy.value = false
  }
}

function printReceipt() {
  window.print()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
    e.preventDefault()
    searchInput.value?.focus()
  }
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    if (cart.value.length > 0 && !checkoutBusy.value) {
      checkout()
    }
  }
  if (e.key === 'Escape' && document.activeElement?.tagName !== 'INPUT') {
    cart.value = []
    checkoutSuccess.value = ''
    checkoutError.value = ''
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <div class="mx-auto max-w-7xl px-4 py-6 lg:px-6 no-print">
      <header class="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">POS Toko Kelontong</p>
          <h1 class="mt-1 text-2xl font-bold text-white">Cashier Workspace</h1>
        </div>
        <div class="flex items-center gap-3">
          <div class="hidden text-right text-[10px] text-slate-500 lg:block">
            <p>Shortcuts: <kbd class="rounded bg-slate-800 px-1 border border-slate-700">/</kbd> Search • <kbd class="rounded bg-slate-800 px-1 border border-slate-700">Ctrl+Ent</kbd> Pay</p>
          </div>
          <button class="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700" @click="refresh">
            Refresh
          </button>
        </div>
      </header>

      <main class="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <div class="flex flex-col gap-4">
          <!-- Catalog -->
          <section class="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h2 class="text-lg font-semibold text-white">Product Catalog</h2>
              <input
                ref="searchInput"
                v-model="query"
                type="text"
                placeholder="Search name/SKU/Barcode..."
                class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-sky-500/40 focus:ring lg:w-80"
              />
            </div>

            <div v-if="pending" class="text-center py-10 text-slate-400">Loading...</div>
            <div v-else class="grid max-h-[45vh] gap-2 overflow-auto pr-1">
              <button
                v-for="p in items"
                :key="p.id"
                class="group flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-left transition hover:border-sky-500/70"
                @click="addToCart(p)"
              >
                <div>
                  <p class="font-semibold text-slate-100">{{ p.name }}</p>
                  <p class="text-xs text-slate-400">SKU {{ p.sku }} • Stock {{ p.stockQty }}</p>
                </div>
                <strong class="text-sm text-emerald-300">Rp {{ Number(p.sellPrice || 0).toLocaleString('id-ID') }}</strong>
              </button>
            </div>
          </section>

          <!-- Recent Activity -->
          <section class="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h2 class="mb-4 text-lg font-semibold text-white">Recent Transactions</h2>
            <div class="grid max-h-48 gap-2 overflow-auto pr-1">
              <div v-for="trx in recentTransactions?.items" :key="trx.id" class="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-semibold text-slate-300">{{ trx.invoiceNumber }}</span>
                  <span class="font-bold text-emerald-400">Rp {{ Number(trx.totalAmount).toLocaleString('id-ID') }}</span>
                </div>
                <div class="flex items-center justify-between text-[10px] text-slate-500">
                  <span>{{ new Date(trx.createdAt).toLocaleTimeString() }} • {{ trx.paymentMethod }}</span>
                  <span>{{ trx.items.length }} items</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside class="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 class="text-lg font-semibold text-white mb-3">Cart</h2>
          <div v-if="cart.length === 0" class="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">Cart is empty.</div>
          <div v-else class="grid max-h-64 gap-2 overflow-auto pr-1 mb-4">
            <div v-for="item in cart" :key="item.id" class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
              <div class="text-xs">
                <p class="font-semibold text-slate-100">{{ item.name }}</p>
                <p class="text-slate-400">Rp {{ item.price.toLocaleString('id-ID') }} × {{ item.qty }}</p>
              </div>
              <div class="flex items-center gap-2">
                <button class="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs" @click="decQty(item.id)">-</button>
                <span class="w-4 text-center text-xs">{{ item.qty }}</span>
                <button class="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs" @click="incQty(item.id)">+</button>
              </div>
            </div>
          </div>

          <div class="space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
            <div class="flex justify-between text-slate-400"><span>Subtotal</span><strong>Rp {{ subtotal.toLocaleString('id-ID') }}</strong></div>
            <div class="grid grid-cols-3 items-center gap-2">
              <label>Discount</label>
              <input v-model.number="discountAmount" type="number" class="col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1" />
            </div>
            <div class="flex justify-between text-white font-bold border-t border-slate-800 pt-2"><span>Total</span><span class="text-sm">Rp {{ totalAmount.toLocaleString('id-ID') }}</span></div>
            
            <div class="grid grid-cols-3 items-center gap-2 pt-2 border-t border-slate-800">
              <label>Customer</label>
              <select v-model="selectedCustomerId" class="col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1">
                <option :value="null">Guest (No Debt)</option>
                <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }} (Debt: {{ Number(c.totalDebt).toLocaleString('id-ID') }})</option>
              </select>
            </div>

            <div class="grid grid-cols-3 items-center gap-2">
              <label>Payment</label>
              <select v-model="paymentMethod" class="col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1">
                <option value="CASH">Cash</option>
                <option value="QRIS">QRIS</option>
                <option value="E_WALLET">E-Wallet</option>
                <option value="DEBT" :disabled="!selectedCustomerId">DEBT (Kasbon)</option>
              </select>
            </div>

            <div v-if="paymentMethod !== 'DEBT'" class="grid grid-cols-3 items-center gap-2">
              <label>Paid</label>
              <input v-model.number="paidAmount" type="number" class="col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1" />
            </div>

            <div class="grid grid-cols-3 items-center gap-2">
              <label>Note</label>
              <input v-model="note" type="text" class="col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1" placeholder="Optional..." />
            </div>

            <div v-if="paymentMethod !== 'DEBT'" class="flex justify-between text-emerald-400 border-t border-slate-800 pt-2"><span>Change</span><strong>Rp {{ changeAmount.toLocaleString('id-ID') }}</strong></div>

            <p v-if="checkoutError" class="text-rose-400 text-[10px]">{{ checkoutError }}</p>
            <p v-if="checkoutSuccess" class="text-emerald-400 text-[10px]">{{ checkoutSuccess }}</p>

            <button
              class="w-full rounded-xl bg-sky-500 py-2 font-bold text-slate-950 transition hover:bg-sky-400 disabled:bg-slate-700"
              :disabled="cart.length === 0 || checkoutBusy"
              @click="checkout"
            >
              {{ checkoutBusy ? '...' : 'Complete Checkout' }}
            </button>
          </div>

          <div v-if="lastReceipt" class="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3 text-[10px]">
            <div class="flex justify-between items-center mb-1">
              <h3 class="font-bold text-sky-300 uppercase">Receipt Preview</h3>
              <button @click="printReceipt" class="underline text-slate-400">Print</button>
            </div>
            <p>Invoice: {{ lastReceipt.invoiceNumber }}</p>
            <p>Total: Rp {{ lastReceipt.totalAmount.toLocaleString('id-ID') }}</p>
          </div>
        </aside>
      </main>
    </div>

    <!-- Hidden Thermal Receipt -->
    <div v-if="lastReceipt" class="print-only thermal-receipt">
      <div class="text-center mb-4">
        <h2 style="font-size: 16px; font-weight: bold;">TOKO KELONTONG</h2>
        <p>Indra's Mart</p>
      </div>
      <div style="border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px;">
        <p>Date: {{ new Date().toLocaleString() }}</p>
        <p>Inv: {{ lastReceipt.invoiceNumber }}</p>
      </div>
      <div style="margin-bottom: 5px;">
        <div v-for="item in lastReceipt.cartItems" :key="item.id" style="display: flex; justify-content: space-between;">
          <span>{{ item.name }} x{{ item.qty }}</span>
          <span>{{ (item.price * item.qty).toLocaleString() }}</span>
        </div>
      </div>
      <div style="border-top: 1px dashed #000; pt: 5px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>TOTAL</span>
          <span>{{ lastReceipt.totalAmount.toLocaleString() }}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>PAID</span>
          <span>{{ (paymentMethod === 'DEBT' ? 0 : lastReceipt.paidAmount).toLocaleString() }}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>CHANGE</span>
          <span>{{ (paymentMethod === 'DEBT' ? 0 : lastReceipt.changeAmount).toLocaleString() }}</span>
        </div>
        <div v-if="paymentMethod === 'DEBT'" style="text-align: center; margin-top: 5px; font-weight: bold;">PAYMENT: DEBT (KASBON)</div>
      </div>
      <div style="text-align: center; margin-top: 15px;">
        <p>Thank you for shopping!</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  body { background: white !important; color: black !important; }
}
.print-only { display: none; }
.thermal-receipt {
  width: 58mm;
  padding: 5mm;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  line-height: 1.2;
  color: black;
  background: white;
}
</style>
