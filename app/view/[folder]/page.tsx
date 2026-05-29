import ViewerClient from "./ViewerClient";
import CartPanel from "@/components/CartPanel";
import ToastHost from "@/components/ToastHost";

export default async function ViewerPage({
  params,
}: {
  params: Promise<{ folder: string }>;
}) {
  const { folder } = await params;
  return (
    <>
      <ViewerClient folder={folder} />
      {/* So "Add to Order" can pop the cart and toasts show inside the 3D view */}
      <CartPanel />
      <ToastHost />
    </>
  );
}
