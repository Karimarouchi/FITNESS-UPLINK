import { CreditCardForm, type CardState, type CardValidity } from "@/components/ui/credit-card-form";

export default function CreditCardFormDemo() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f5f1" }}>
      <CreditCardForm
        defaultHolder="RAHIL VAHORA"
        maskMiddle
        onChange={(_state: CardState, _validity: CardValidity) => {
          /* live preview */
        }}
        onSubmit={() => {
          /* send to API from the payment page */
        }}
      />
    </main>
  );
}
