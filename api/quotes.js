export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const symbols = searchParams.get('symbols') || '';
  const fields = "regularMarketPrice,regularMarketChangePercent,trailingPE,forwardPE,trailingPegRatio,grossMargins,returnOnEquity,debtToEquity,revenueGrowth,freeCashflow,marketCap,recommendationMean,fiftyTwoWeekLow,fiftyTwoWeekHigh,shortName,regularMarketVolume,trailingAnnualDividendYield,enterpriseToEbitda";

  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=${fields}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      }
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=30',
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
