import { useEffect, useState, useRef } from 'react';
import { calcularTriangulacao, SafeOps } from '../utils/calculations';
import { salvarFocosStorage, carregarFocosStorage, enqueuePing } from '../utils/storage';
import { MAX_FOCOS, MIN_FOCOS_FOR_TRIANGULATION } from '../constants';

export function useFocos() {
  const [focos, setFocos] = useState([]);
  const [triangulacaoResultado, setTriangulacaoResultado] = useState(null);
  const [marcandoFocoMapa, setMarcandoFocoMapa] = useState(false);
  const [inputsManualFoco, setInputsManualFoco] = useState({
    latitude: '',
    longitude: '',
    altitude: '',
    heading: '',
    pitch: '',
    distancia: ''
  });
  const [waypointTemporario, setWaypointTemporario] = useState(null);
  const [focoPendente, setFocoPendente] = useState(false);
  const [focoSalvoAgora, setFocoSalvoAgora] = useState(false);

  const focosRef = useRef(focos);
  const waypointTemporarioRef = useRef(waypointTemporario);

  // Manter refs atualizadas
  useEffect(() => {
    focosRef.current = focos;
  }, [focos]);

  useEffect(() => {
    waypointTemporarioRef.current = waypointTemporario;
  }, [waypointTemporario]);

  // 💾 Carregar focos salvos ao iniciar
  useEffect(() => {
    (async () => {
      try {
        const focosSalvos = await carregarFocosStorage();
        if (focosSalvos.length > 0) {
          setFocos(focosSalvos);
          console.log('✅ Focos carregados:', focosSalvos.length);

          // Recalcular triangulação se tem >= 2 focos
          if (focosSalvos.length >= MIN_FOCOS_FOR_TRIANGULATION) {
            const resultado = calcularTriangulacao(focosSalvos);
            setTriangulacaoResultado(resultado);
          }
        }
      } catch (err) {
        console.error('❌ Erro ao carregar focos iniciais:', err);
      }
    })();
  }, []);

  // ⏰ Reset estado "Salvo" após 3 segundos
  useEffect(() => {
    if (focoSalvoAgora) {
      const timer = setTimeout(() => {
        setFocoSalvoAgora(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [focoSalvoAgora]);

  // ✅ SALVAR FOCO MANUAL
  const salvarFocoManual = () => {
    console.log('📝 Clicou em Salvar!');

    if (!inputsManualFoco || (!inputsManualFoco.latitude && !inputsManualFoco.longitude)) {
      console.warn('⚠️ Clique no mapa antes de salvar!');
      return;
    }

    const lat = parseFloat(inputsManualFoco.latitude || 0);
    const lon = parseFloat(inputsManualFoco.longitude || 0);
    const alt = parseFloat(inputsManualFoco.altitude) || 0;
    const dist = parseFloat(inputsManualFoco.distancia) || 0;

    console.log('Dados:', { lat, lon, alt, dist });

    if (isNaN(lat) || isNaN(lon) || isNaN(dist)) {
      console.warn('⚠️ Dados inválidos');
      return;
    }

    if (focos.length >= MAX_FOCOS) {
      console.warn('⚠️ Limite de focos atingido');
      return;
    }

    const novoFoco = {
      id: Date.now(),
      latitude: lat,
      longitude: lon,
      altitude: alt,
      heading: SafeOps.parseNumber(inputsManualFoco.heading, 0),
      pitch: SafeOps.parseNumber(inputsManualFoco.pitch, 0),
      distancia: dist,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      observadorId: `Obs-${focos.length + 1}`
    };

    const novosFocos = [...focos, novoFoco];
    setFocos(novosFocos);

    // Enfileira para backend quando online voltar
    enqueuePing(novoFoco);
    console.log('✅ Foco adicionado:', novoFoco.observadorId);

    // Salvar no AsyncStorage de forma assíncrona
    salvarFocosStorage(novosFocos)
      .then(() => {
        console.log('✅ Salvo no storage!');
      })
      .catch((err) => {
        console.error('❌ Erro ao salvar:', err);
      });

    // Calcular triangulação
    if (novosFocos.length >= MIN_FOCOS_FOR_TRIANGULATION) {
      const resultado = calcularTriangulacao(novosFocos);
      setTriangulacaoResultado(resultado);
      console.log('🎯 Triangulação calculada!');
    }

    // Limpar inputs
    setInputsManualFoco({
      latitude: '',
      longitude: '',
      altitude: '',
      heading: '',
      pitch: '',
      distancia: ''
    });
    setWaypointTemporario(null);
    console.log('✅ Inputs limpos!');

    // Mostrar "Salvo!"
    setFocoSalvoAgora(true);
    console.log('✅ Mostrando "Salvo!"');
  };

  // 🎯 MARCAR FOCO (pela câmera)
  const marcarFoco = (location, cameraDynamicDistance, smoothHeading, pitchAngle) => {
    console.log('🎯 Tentando marcar foco...', {
      location: location ? 'OK' : 'FALTA',
      cameraDynamicDistance,
      focos: focos.length
    });

    if (!location) {
      console.warn('⚠️ GPS não disponível');
      return false;
    }

    if (cameraDynamicDistance === null || cameraDynamicDistance === undefined) {
      console.warn('⚠️ Distância não disponível');
      return false;
    }

    if (focos.length >= MAX_FOCOS) {
      console.warn('⚠️ Limite atingido');
      return false;
    }

    const novoFoco = {
      id: Date.now(),
      latitude: location.latitude,
      longitude: location.longitude,
      altitude: location.altitude || 0,
      heading: (Math.round(smoothHeading) % 360) || 0,
      pitch: Math.round(pitchAngle),
      distancia: cameraDynamicDistance,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      observadorId: `Obs-${focos.length + 1}`
    };

    const novosFocos = [...focos, novoFoco];
    setFocos(novosFocos);

    // Enfileira para backend
    enqueuePing(novoFoco);

    // Calcular triangulação se temos >= 2 focos
    if (novosFocos.length >= MIN_FOCOS_FOR_TRIANGULATION) {
      const resultado = calcularTriangulacao(novosFocos);
      setTriangulacaoResultado(resultado);
      console.log('🎯 Triangulação:', resultado);
    }

    console.log('✅ Foco marcado:', novoFoco.observadorId);
    return true;
  };

  // 🗑️ REMOVER FOCO
  const removerFoco = (focoId) => {
    const novosFocos = focos.filter((f) => f.id !== focoId);
    setFocos(novosFocos);

    if (novosFocos.length >= MIN_FOCOS_FOR_TRIANGULATION) {
      const resultado = calcularTriangulacao(novosFocos);
      setTriangulacaoResultado(resultado);
    } else {
      setTriangulacaoResultado(null);
    }

    salvarFocosStorage(novosFocos);
  };

  // 🧹 LIMPAR TODOS OS FOCOS
  const limparTodosFocos = () => {
    setFocos([]);
    setTriangulacaoResultado(null);
    setInputsManualFoco({
      latitude: '',
      longitude: '',
      altitude: '',
      heading: '',
      pitch: '',
      distancia: ''
    });
    setWaypointTemporario(null);
    salvarFocosStorage([]);
    console.log('🧹 Todos os focos removidos');
  };

  const safeInputsManualFoco = inputsManualFoco || {
    latitude: '',
    longitude: '',
    altitude: '',
    heading: '',
    pitch: '',
    distancia: ''
  };

  return {
    focos,
    setFocos,
    triangulacaoResultado,
    setTriangulacaoResultado,
    marcandoFocoMapa,
    setMarcandoFocoMapa,
    inputsManualFoco,
    setInputsManualFoco,
    waypointTemporario,
    setWaypointTemporario,
    focoPendente,
    setFocoPendente,
    focoSalvoAgora,
    setFocoSalvoAgora,
    salvarFocoManual,
    marcarFoco,
    removerFoco,
    limparTodosFocos,
    safeInputsManualFoco,
  };
}
 