export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || '';

  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'Referer': 'https://finance.yahoo.com',
      }
    });
    const data = await res.json();
    const price = data?.quoteSummary?.result?.[0]?.price;
    if (!price) throw new Error('Not found');
    return new Response(JSON.stringify({
      ok: true,
      symbol: price.symbol,
      name: price.shortName || price.longName || symbol,
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
