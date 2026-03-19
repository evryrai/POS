<script setup lang="ts">
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

const { data, pending, refresh } = await useFetch('/api/products', {
  query: computed(() => ({ q: query.value, limit: 30, offset: 0 }))
})

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
  } catch (error: any) {
    checkoutError.value = error?.data?.statusMessage || error?.message || 'Checkout failed'
  } finally {
    checkoutBusy.value = false
  }
}
</script>

<template>
  <div class="screen">
    <header class="topbar">
      <div>
        <p class="eyebrow">POS Toko Kelontong</p>
        <h1>Cashier Workspace</h1>
      </div>
      <button class="ghost" @click="refresh">Refresh Products</button>
    </header>

    <main class="grid">
      <section class="products card">
        <div class="section-head">
          <h2>Products</h2>
          <input v-model="query" type="text" placeholder="Search product or SKU..." class="search" />
        </div>

        <div v-if="pending" class="state">Loading products...</div>
        <div v-else-if="items.length === 0" class="state">No products found. Add product first from API.</div>

        <div v-else class="product-list">
          <button v-for="p in items" :key="p.id" class="product-item" @click="addToCart(p)">
            <div>
              <p class="name">{{ p.name }}</p>
              <p class="meta">SKU: {{ p.sku }} · Stock: {{ p.stockQty }}</p>
            </div>
            <strong>Rp {{ Number(p.sellPrice || 0).toLocaleString('id-ID') }}</strong>
          </button>
        </div>
      </section>

      <aside class="cart card">
        <div class="section-head">
          <h2>Cart</h2>
          <span>{{ cart.length }} items</span>
        </div>

        <div v-if="cart.length === 0" class="state">Cart is empty.</div>

        <div v-else class="cart-list">
          <div v-for="item in cart" :key="item.id" class="cart-item">
            <div>
              <p class="name">{{ item.name }}</p>
              <p class="meta">Rp {{ item.price.toLocaleString('id-ID') }} x {{ item.qty }}</p>
            </div>
            <div class="qty-actions">
              <button class="ghost small" @click="decQty(item.id)">-</button>
              <span>{{ item.qty }}</span>
              <button class="ghost small" @click="incQty(item.id)">+</button>
            </div>
          </div>
        </div>

        <div class="checkout">
          <div class="row"><span>Subtotal</span><strong>Rp {{ subtotal.toLocaleString('id-ID') }}</strong></div>

          <div class="row form-row">
            <span>Discount</span>
            <input v-model.number="discountAmount" type="number" min="0" class="input" />
          </div>

          <div class="row"><span>Total</span><strong>Rp {{ totalAmount.toLocaleString('id-ID') }}</strong></div>

          <div class="row form-row">
            <span>Payment</span>
            <select v-model="paymentMethod" class="select">
              <option value="CASH">Cash</option>
              <option value="QRIS">QRIS</option>
              <option value="E_WALLET">E-Wallet</option>
            </select>
          </div>

          <div class="row form-row">
            <span>Paid</span>
            <input v-model.number="paidAmount" type="number" min="0" class="input" />
          </div>

          <div class="row form-row notes">
            <span>Note</span>
            <input v-model="note" type="text" class="input" placeholder="Optional transaction note" />
          </div>

          <div class="row"><span>Change</span><strong>Rp {{ changeAmount.toLocaleString('id-ID') }}</strong></div>

          <p v-if="checkoutError" class="error">{{ checkoutError }}</p>
          <p v-if="checkoutSuccess" class="success">{{ checkoutSuccess }}</p>

          <button class="primary" :disabled="cart.length === 0 || checkoutBusy" @click="checkout">
            {{ checkoutBusy ? 'Processing...' : 'Complete Checkout' }}
          </button>
        </div>

        <div v-if="lastReceipt" class="receipt">
          <h3>Receipt Preview</h3>
          <p>Invoice: <strong>{{ lastReceipt.invoiceNumber }}</strong></p>
          <p>Total: Rp {{ lastReceipt.totalAmount.toLocaleString('id-ID') }}</p>
          <p>Paid: Rp {{ lastReceipt.paidAmount.toLocaleString('id-ID') }}</p>
          <p>Change: Rp {{ lastReceipt.changeAmount.toLocaleString('id-ID') }}</p>
        </div>
      </aside>
    </main>
  </div>
</template>

<style scoped>
:root { color-scheme: dark; }
.screen { min-height: 100vh; background: #0b1220; color: #e2e8f0; padding: 1rem; }
.topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.eyebrow { color: #93c5fd; margin: 0; font-size: .85rem; }
h1 { margin: .15rem 0 0; font-size: 1.4rem; }
.grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 1rem; }
.card { background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 1rem; }
.section-head { display: flex; justify-content: space-between; align-items: center; gap: .75rem; margin-bottom: .75rem; }
.search, .input, .select { width: 260px; border-radius: 10px; border: 1px solid #334155; background: #0f172a; color: #e2e8f0; padding: .55rem .7rem; }
.product-list, .cart-list { display: flex; flex-direction: column; gap: .55rem; max-height: 45vh; overflow: auto; }
.product-item { display: flex; justify-content: space-between; align-items: center; gap: .8rem; width: 100%; border: 1px solid #1f2937; border-radius: 12px; background: #0f172a; color: inherit; padding: .75rem; cursor: pointer; }
.product-item:hover { border-color: #3b82f6; }
.name { margin: 0; font-weight: 600; }
.meta { margin: .2rem 0 0; font-size: .83rem; color: #94a3b8; }
.state { color: #94a3b8; padding: 1rem 0; }
.cart-item { display: flex; justify-content: space-between; align-items: center; border: 1px solid #1f2937; border-radius: 12px; padding: .65rem; }
.qty-actions { display: flex; align-items: center; gap: .45rem; }
button { border: none; border-radius: 10px; padding: .6rem .85rem; cursor: pointer; }
.ghost { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; }
.small { padding: .25rem .5rem; }
.primary { background: #2563eb; color: #fff; width: 100%; margin-top: .75rem; }
.primary:disabled { opacity: .5; cursor: not-allowed; }
.checkout { border-top: 1px solid #1f2937; margin-top: .75rem; padding-top: .75rem; }
.row { display: flex; justify-content: space-between; align-items: center; gap: .6rem; }
.form-row { margin-top: .5rem; }
.notes { align-items: flex-start; }
.error { color: #fca5a5; margin: .6rem 0 0; font-size: .9rem; }
.success { color: #86efac; margin: .6rem 0 0; font-size: .9rem; }
.receipt { margin-top: .9rem; border-top: 1px dashed #334155; padding-top: .7rem; color: #cbd5e1; font-size: .9rem; }
.receipt h3 { margin: 0 0 .5rem; font-size: 1rem; color: #93c5fd; }
.receipt p { margin: .2rem 0; }
@media (max-width: 960px) {
  .grid { grid-template-columns: 1fr; }
  .search, .input, .select { width: 100%; }
  .section-head { flex-direction: column; align-items: stretch; }
}
</style>
