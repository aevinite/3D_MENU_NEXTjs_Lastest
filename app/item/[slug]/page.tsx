import ItemClient from "./ItemClient";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ItemClient slug={slug} />;
}
