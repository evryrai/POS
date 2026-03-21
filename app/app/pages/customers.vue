<script setup lang="ts">
import { ref, computed } from 'vue'

type CustomerItem = {
  id: string
  name: string
  phone: string | null
  address: string | null
  totalDebt: number
  debtLimit: number
}

const { data, pending, refresh } = await useFetch('/api/customers', {
  query: { limit: 100 }
})

const items = computed<CustomerItem[]>(() => data.value?.items ?? [])

const isModalOpen = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const form = ref({
  name: '',
  phone: '',
  address: '',
  debtLimit: 1000000
})

function openCreateModal() {
  form.value = { name: '', phone: '', address: '', debtLimit: 1000000 }
  errorMessage.value = ''
  successMessage.value = ''
  isModalOpen.value = true
}

async function submitForm() {
  errorMessage.value = ''
  successMessage.value = ''
  isSubmitting.value = true

  try {
    await $fetch('/api/customers', { method: 'POST', body: form.value })
    successMessage.value = 'Customer created successfully'
    await refresh()
    setTimeout(() => {
      isModalOpen.value = false
    }, 1000)
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Failed to save customer'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-4 lg:p-8">
    <div class="mx-auto max-w-5xl space-y-6">
      <header class="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Master Data</p>
          <h1 class="mt-1 text-2xl font-bold text-white">Customer Management</h1>
          <p class="mt-1 text-sm text-slate-400">Manage customer profiles and debt (kasbon) limits.</p>
        </div>
        <div class="flex items-center gap-3">
          <a href="/" class="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700">Back to POS</a>
          <button @click="openCreateModal" class="rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-sky-400">
            + New Customer
          </button>
        </div>
      </header>

      <div class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div v-if="pending" class="text-center py-10 text-slate-400">Loading customers...</div>
        <div v-else-if="items.length === 0" class="text-center py-10 text-slate-400">No customers found.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-300">
            <thead class="bg-slate-900 text-xs uppercase text-slate-500 border-b border-slate-800">
              <tr>
                <th class="px-4 py-3">Name</th>
                <th class="px-4 py-3">Phone</th>
                <th class="px-4 py-3 text-right">Total Debt</th>
                <th class="px-4 py-3 text-right">Limit</th>
                <th class="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              <tr v-for="c in items" :key="p.id" class="hover:bg-slate-900/50 transition">
                <td class="px-4 py-3 font-medium text-slate-200">{{ c.name }}</td>
                <td class="px-4 py-3">{{ c.phone || '-' }}</td>
                <td class="px-4 py-3 text-right text-rose-400 font-bold">Rp {{ Number(c.totalDebt).toLocaleString('id-ID') }}</td>
                <td class="px-4 py-3 text-right text-slate-400">Rp {{ Number(c.debtLimit).toLocaleString('id-ID') }}</td>
                <td class="px-4 py-3 text-center">
                  <span :class="Number(c.totalDebt) >= Number(c.debtLimit) ? 'text-rose-500 font-bold' : 'text-emerald-500'">
                    {{ Number(c.totalDebt) >= Number(c.debtLimit) ? 'LIMIT REACHED' : 'OK' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Form -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div class="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-800 p-5">
          <h2 class="text-lg font-semibold text-white">New Customer</h2>
          <button @click="isModalOpen = false" class="text-slate-400 hover:text-slate-200">&times;</button>
        </div>

        <div class="p-5 space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-1">Name (Required)</label>
            <input v-model="form.name" type="text" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:ring focus:ring-sky-500/40" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-1">Phone (Optional)</label>
            <input v-model="form.phone" type="text" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:ring focus:ring-sky-500/40" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-1">Debt Limit (Rp)</label>
            <input v-model.number="form.debtLimit" type="number" min="0" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:ring focus:ring-sky-500/40" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-1">Address</label>
            <textarea v-model="form.address" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:ring focus:ring-sky-500/40" rows="2"></textarea>
          </div>
        </div>

        <div class="border-t border-slate-800 p-5 flex flex-col gap-3">
          <p v-if="errorMessage" class="text-sm text-rose-400">{{ errorMessage }}</p>
          <p v-if="successMessage" class="text-sm text-emerald-400">{{ successMessage }}</p>
          <div class="flex justify-end gap-3">
            <button @click="isModalOpen = false" class="rounded-xl px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200">Cancel</button>
            <button @click="submitForm" :disabled="isSubmitting" class="rounded-xl bg-sky-500 px-6 py-2 text-sm font-bold text-slate-950 transition hover:bg-sky-400">
              Save Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
