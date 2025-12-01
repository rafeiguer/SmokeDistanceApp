// services/satelite.js
// Serviço para buscar focos de incêndio de três satélites (INPE, FIRMS/NASA, NOAA)

export async function buscarFocosSatelite({ latitude, longitude, raioKm = 50 }) {
  // Exemplo de endpoints (substitua pelas APIs reais)
  const endpoints = [
    {
      nome: 'INPE',
      url: `https://queimadas.dgi.inpe.br/api/focos?lat=${latitude}&lon=${longitude}&raio=${raioKm}`
    },
    {
      nome: 'FIRMS/NASA',
      url: `https://firms.modaps.eosdis.nasa.gov/api/area?lat=${latitude}&lon=${longitude}&radius=${raioKm}`
    },
    {
      nome: 'NOAA',
      url: `https://noaa.gov/api/fires?lat=${latitude}&lon=${longitude}&radius=${raioKm}`
    }
  ];

  const resultados = [];
  for (const sat of endpoints) {
    try {
      const resp = await fetch(sat.url);
      const data = await resp.json();
      resultados.push({
        satelite: sat.nome,
        focos: data.focos || data || [],
        raw: data
      });
    } catch (err) {
      resultados.push({
        satelite: sat.nome,
        focos: [],
        erro: err.message
      });
    }
  }
  return resultados;
}
