# M2 Checkout Implementation Notes

## Current Scope Delivered
- Cashier workspace UI foundation (`app/app/pages/index.vue`)
- Product list + search + cart interaction
- Checkout API (`POST /api/checkout`)
- Stock deduction and stock movement recording on successful sale
- UI support for:
  - discount amount
  - payment method (CASH/QRIS/E_WALLET)
  - paid amount
  - transaction note
  - receipt preview (invoice/total/paid/change)
- Out-of-stock guard in cart increment and add-to-cart interactions

## API Contract
### Endpoint
`POST /api/checkout`

### Request Body
```json
{
  "items": [{ "productId": "string", "qty": 1 }],
  "paymentMethod": "CASH",
  "paidAmount": 100000,
  "discountAmount": 5000,
  "note": "optional"
}
```

### Success Response
```json
{
  "ok": true,
  "invoiceNumber": "INV-20260319-ABCDE",
  "transactionId": "cm...",
  "totalAmount": 95000,
  "paidAmount": 100000,
  "changeAmount": 5000
}
```

### Error Cases
- `400 Invalid payload`
- `400 Paid amount is lower than total amount`
- `400 Some products are missing/inactive`
- `409 Insufficient stock for <name>`
- `401 Unauthorized`

## Data Side Effects
On successful checkout transaction:
1. Create `Transaction`
2. Create `TransactionItem[]`
3. Decrease `Product.stockQty`
4. Create `StockMovement` with type `SALE`

All writes are wrapped in Prisma transaction for consistency.

## Remaining Next Steps
- Add automated API tests for checkout happy/failure paths
- Add printable receipt layout
- Add cashier shortcut keys (quick qty and pay)
- Add checkout history panel (recent transactions)
