<script setup lang="ts">
const { data: shiftStatus, refresh: refreshShift } = await useFetch('/api/shifts/open')
const startingCash = ref(0)
const isOpening = ref(false)

const { data: closeStatus } = await useFetch('/api/shifts/close')
const actualCash = ref(0)
const closingNote = ref('')
const isClosing = ref(false)

async function openShift() {
  isOpening.ref = true
  try {
    await $fetch('/api/shifts/open', {
      method: 'POST',
      body: { startingCash: startingCash.value }
    })
    await refreshShift()
  } catch (err: any) {
    alert(err.data?.statusMessage || 'Failed to open shift')
  } finally {
    isOpening.value = false
  }
}

async function closeShift() {
  isClosing.value = true
  try {
    const res = await $fetch('/api/shifts/close', {
      method: 'POST',
      body: { actualCash: actualCash.value, note: closingNote.value }
    })
    alert(`Shift Closed. Difference: Rp ${Number(res.closedShift.difference).toLocaleString('id-ID')}`)
    await refreshShift()
  } catch (err: any) {
    alert(err.data?.statusMessage || 'Failed to close shift')
  } finally {
    isClosing.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-4 lg:p-8">
    <div class="mx-auto max-w-2xl space-y-6">
      <header class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
        <h1 class="text-2xl font-bold text-white">Cashier Shift</h1>
        <p class="text-sm text-slate-400">Manage drawer cash and session tracking.</p>
      </header>

      <!-- OPEN SHIFT FORM -->
      <div v-if="!shiftStatus?.activeShift" class="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 class="text-lg font-semibold text-emerald-400">Open New Shift</h2>
        <p class="text-sm text-slate-400">Input starting cash in the drawer to begin.</p>
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-1">Starting Cash (Modal Awal)</label>
          <input v-model.number="startingCash" type="number" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:ring focus:ring-emerald-500/40" />
        </div>
        <button @click="openShift" :disabled="isOpening" class="w-full rounded-xl bg-emerald-500 py-3 font-bold text-slate-950 hover:bg-emerald-400 transition">
          Start Working
        </button>
      </div>

      <!-- CLOSE SHIFT FORM -->
      <div v-else class="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-6">
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold text-rose-400">Active Shift</h2>
          <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">OPEN</span>
        </div>
        
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <p class="text-slate-500">Started at</p>
            <p class="font-medium">{{ new Date(shiftStatus.activeShift.startTime).toLocaleTimeString() }}</p>
          </div>
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <p class="text-slate-500">Starting Cash</p>
            <p class="font-medium">Rp {{ Number(shiftStatus.activeShift.startingCash).toLocaleString('id-ID') }}</p>
          </div>
        </div>

        <hr class="border-slate-800" />

        <div class="space-y-4">
          <h3 class="font-medium text-white">Close Shift & Reconcile</h3>
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-1">Actual Cash in Drawer (Uang Fisik)</label>
            <input v-model.number="actualCash" type="number" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:ring focus:ring-rose-500/40" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-1">Closing Note</label>
            <textarea v-model="closingNote" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:ring focus:ring-rose-500/40" rows="2"></textarea>
          </div>
          <button @click="closeShift" :disabled="isClosing" class="w-full rounded-xl bg-rose-600 py-3 font-bold text-white hover:bg-rose-500 transition">
            End Shift & Lock Drawer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
