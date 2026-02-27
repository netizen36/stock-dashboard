export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || 'AAPL';

  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=insiderTransactions`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    const data = await res.json();
    const transactions = data?.quoteSummary?.result?.[0]?.insiderTransactions?.transactions || [];
    return new Response(JSON.stringify({ insiders: transactions }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=3600',
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ insiders: [], error: e.message }), { status: 500 });
  }
}
