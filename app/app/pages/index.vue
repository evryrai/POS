<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

type ProductItem = {
  id: string
  sku: string
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
}

const query = ref('')
const cart = ref<CartItem[]>([])
const paymentMethod = ref<'CASH' | 'QRIS' | 'E_WALLET'>('CASH')
const paidAmount = ref(0)
const discountAmount = ref(0)
const note = ref('')
const checkoutBusy = ref(false)
const checkoutError = ref('')
const checkoutSuccess = ref('')
const lastReceipt = ref<CheckoutResponse | null>(null)

const searchInput = ref<HTMLInputElement | null>(null)

const { data, pending, refresh } = await useFetch('/api/products', {
  query: computed(() => ({ q: query.value, limit: 30, offset: 0 }))
})

const { data: recentTransactions, refresh: refreshRecent } = await useFetch('/api/transactions/recent')

const items = computed<ProductItem[]>(() => data.value?.items ?? [])
const stockMap = computed(() => new Map(items.value.map((p) => [p.id, Number(p.stockQty || 0)])))
const subtotal = computed(() => cart.value.reduce((sum, item) => sum + item.price * item.qty, 0))
const totalAmount = computed(() => Math.max(0, subtotal.value - discountAmount.value))
const changeAmount = computed(() => Math.max(0, paidAmount.value - totalAmount.value))

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

  checkoutBusy.value = true
  try {
    const res = await $fetch<CheckoutResponse>('/api/checkout', {
      method: 'POST',
      body: {
        items: cart.value.map((x) => ({ productId: x.id, qty: x.qty })),
        paymentMethod: paymentMethod.value,
        paidAmount: paidAmount.value,
        discountAmount: discountAmount.value,
        note: note.value || undefined
      }
    })

    checkoutSuccess.value = `Success: ${res.invoiceNumber} · Change Rp ${res.changeAmount.toLocaleString('id-ID')}`
    lastReceipt.value = res
    cart.value = []
    paidAmount.value = 0
    discountAmount.value = 0
    note.value = ''
    await refresh()
    await refreshRecent()
  } catch (error: any) {
    checkoutError.value = error?.data?.statusMessage || error?.message || 'Checkout failed'
  } finally {
    checkoutBusy.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  // Focus search: /
  if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
    e.preventDefault()
    searchInput.value?.focus()
  }
  // Complete checkout: Ctrl+Enter or Cmd+Enter
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    if (cart.value.length > 0 && !checkoutBusy.value) {
      checkout()
    }
  }
  // Clear cart: Esc (only if not in input)
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
    <div class="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      <header class="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">POS Toko Kelontong</p>
          <h1 class="mt-1 text-2xl font-bold text-white">Cashier Workspace</h1>
          <p class="mt-1 text-sm text-slate-400">Fast checkout flow with stock-safe cart handling.</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="hidden text-right text-[10px] text-slate-500 lg:block">
            <p>Shortcuts:</p>
            <p><kbd class="rounded bg-slate-800 px-1 border border-slate-700">/</kbd> Search</p>
            <p><kbd class="rounded bg-slate-800 px-1 border border-slate-700">Ctrl+Enter</kbd> Pay</p>
          </div>
          <button class="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-700" @click="refresh">
            Refresh Products
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
                placeholder="Search (press / to focus)..."
                class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-sky-500/40 placeholder:text-slate-500 focus:ring lg:w-80"
              />
            </div>

            <div v-if="pending" class="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">Loading products...</div>
            <div v-else-if="items.length === 0" class="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">No products found.</div>

            <div v-else class="grid max-h-[45vh] gap-2 overflow-auto pr-1">
              <button
                v-for="p in items"
                :key="p.id"
                class="group flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-left transition hover:border-sky-500/70 hover:bg-slate-900"
                @click="addToCart(p)"
              >
                <div>
                  <p class="font-semibold text-slate-100 group-hover:text-white">{{ p.name }}</p>
                  <p class="text-xs text-slate-400">SKU {{ p.sku }} • Stock {{ p.stockQty }}</p>
                </div>
                <strong class="text-sm text-emerald-300">Rp {{ Number(p.sellPrice || 0).toLocaleString('id-ID') }}</strong>
              </button>
            </div>
          </section>

          <!-- Recent Activity -->
          <section class="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-white">Recent Transactions</h2>
              <button class="text-xs text-sky-400 hover:text-sky-300" @click="refreshRecent">Refresh</button>
            </div>
            
            <div class="grid max-h-48 gap-2 overflow-auto pr-1">
              <div v-for="trx in recentTransactions?.items" :key="trx.id" class="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-slate-300">{{ trx.invoiceNumber }}</span>
                  <span class="text-xs font-bold text-emerald-400">Rp {{ Number(trx.totalAmount).toLocaleString('id-ID') }}</span>
                </div>
                <div class="flex items-center justify-between text-xs text-slate-500">
                  <span>{{ new Date(trx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }} • {{ trx.paymentMethod }}</span>
                  <span>{{ trx.items.length }} items</span>
                </div>
              </div>
              <div v-if="!recentTransactions?.items?.length" class="text-sm text-slate-500">No recent transactions.</div>
            </div>
          </section>
        </div>

        <aside class="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-white">Cart</h2>
            <span class="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">{{ cart.length }} lines</span>
          </div>

          <div v-if="cart.length === 0" class="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">Cart is empty.</div>

          <div v-else class="grid max-h-64 gap-2 overflow-auto pr-1">
            <div v-for="item in cart" :key="item.id" class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
              <div>
                <p class="text-sm font-semibold text-slate-100">{{ item.name }}</p>
                <p class="text-xs text-slate-400">Rp {{ item.price.toLocaleString('id-ID') }} × {{ item.qty }}</p>
              </div>
              <div class="flex items-center gap-2">
                <button class="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs hover:bg-slate-800" @click="decQty(item.id)">-</button>
                <span class="w-6 text-center text-sm text-slate-200">{{ item.qty }}</span>
                <button class="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs hover:bg-slate-800" @click="incQty(item.id)">+</button>
              </div>
            </div>
          </div>

          <div class="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div class="flex items-center justify-between text-sm"><span class="text-slate-400">Subtotal</span><strong>Rp {{ subtotal.toLocaleString('id-ID') }}</strong></div>

            <div class="grid grid-cols-3 items-center gap-2 text-sm">
              <label class="text-slate-400">Discount</label>
              <input v-model.number="discountAmount" type="number" min="0" class="col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-100 outline-none focus:ring-1 focus:ring-sky-500" />
            </div>

            <div class="flex items-center justify-between text-sm"><span class="text-slate-300">Total</span><strong class="text-base text-white">Rp {{ totalAmount.toLocaleString('id-ID') }}</strong></div>

            <div class="grid grid-cols-3 items-center gap-2 text-sm">
              <label class="text-slate-400">Payment</label>
              <select v-model="paymentMethod" class="col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-100 outline-none focus:ring-1 focus:ring-sky-500">
                <option value="CASH">Cash</option>
                <option value="QRIS">QRIS</option>
                <option value="E_WALLET">E-Wallet</option>
              </select>
            </div>

            <div class="grid grid-cols-3 items-center gap-2 text-sm">
              <label class="text-slate-400">Paid</label>
              <input v-model.number="paidAmount" type="number" min="0" class="col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-100 outline-none focus:ring-1 focus:ring-sky-500" />
            </div>

            <div class="grid grid-cols-3 items-start gap-2 text-sm">
              <label class="pt-1 text-slate-400">Note</label>
              <input v-model="note" type="text" class="col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-100 outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-sky-500" placeholder="Optional transaction note" />
            </div>

            <div class="flex items-center justify-between text-sm"><span class="text-slate-400">Change</span><strong class="text-emerald-300">Rp {{ changeAmount.toLocaleString('id-ID') }}</strong></div>

            <p v-if="checkoutError" class="rounded-lg border border-rose-900/60 bg-rose-950/40 px-2 py-1 text-xs text-rose-300">{{ checkoutError }}</p>
            <p v-if="checkoutSuccess" class="rounded-lg border border-emerald-900/60 bg-emerald-950/40 px-2 py-1 text-xs text-emerald-300">{{ checkoutSuccess }}</p>

            <button
              class="w-full rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              :disabled="cart.length === 0 || checkoutBusy"
              @click="checkout"
            >
              {{ checkoutBusy ? 'Processing...' : 'Complete Checkout' }}
            </button>
          </div>

          <div v-if="lastReceipt" class="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm">
            <h3 class="mb-2 font-semibold text-sky-300">Receipt Preview</h3>
            <p class="text-slate-300">Invoice: <span class="font-semibold text-white">{{ lastReceipt.invoiceNumber }}</span></p>
            <p class="text-slate-300">Total: Rp {{ lastReceipt.totalAmount.toLocaleString('id-ID') }}</p>
            <p class="text-slate-300">Paid: Rp {{ lastReceipt.paidAmount.toLocaleString('id-ID') }}</p>
            <p class="text-slate-300">Change: Rp {{ lastReceipt.changeAmount.toLocaleString('id-ID') }}</p>
          </div>
        </aside>
      </main>
    </div>
  </div>
</template>
