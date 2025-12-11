// 🔥 PROPAGATION SCREEN - Interface Industrial de Cálculo de Propagação
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert
} from 'react-native';
import {
  taxaPropagacao,
  calcularArea,
  obterParametrosCombustivel,
  calcularIntervalosTemporais
} from '../services/PropagationCalculator';
import {
  ColetorPontosTerreno,
  classificarTerreno,
  calcularPressaoPorAltitude,
  validarDadosTerreno
} from '../services/TerrainService';
import {
  listarTiposVegetacao,
  estimarVegetacaoPorRegiao,
  obterDescricaoVegetacao,
  validarDensidadeCombustivel
} from '../services/VegetationService';

export default function PropagationScreen({
  darkMode,
  location,
  meteoDataDinamica,
  setPage,
  setPropagacaoResultado
}) {
  // Estados - Modos Auto/Manual
  const [modoAltitude, setModoAltitude] = useState(true); // true = auto
  const [modoInclinacao, setModoInclinacao] = useState(false);
  const [modoVegetacao, setModoVegetacao] = useState(true);
  const [modoDensidade, setModoDensidade] = useState(true);
  const [modoVento, setModoVento] = useState(true);
  const [modoPressao, setModoPressao] = useState(true);

  // Estados - Valores
  const [altitude, setAltitude] = useState('0');
  const [inclinacao, setInclinacao] = useState('0');
  const [tipoVegetacao, setTipoVegetacao] = useState('cerrado');
  const [densidadeCombustivel, setDensidadeCombustivel] = useState('25');
  const [velocidadeVento, setVelocidadeVento] = useState('0');
  const [direcaoVento, setDirecaoVento] = useState('0');
  const [pressaoAtm, setPressaoAtm] = useState('1013');

  // Estados - Resultado
  const [resultado, setResultado] = useState(null);
  const [calculando, setCalculando] = useState(false);

  // Coletor de pontos para inclinação automática
  const [coletorTerreno] = useState(new ColetorPontosTerreno());

  // 🔄 Atualização automática dos valores
  useEffect(() => {
    // Altitude automática (GPS)
    if (modoAltitude && location?.altitude) {
      setAltitude(Math.round(location.altitude).toString());
    }

    // Pressão automática (calculada por altitude)
    if (modoPressao && location?.altitude) {
      const pressaoCalc = calcularPressaoPorAltitude(location.altitude);
      setPressaoAtm(pressaoCalc.toString());
    }

    // Vento automático (Weather API)
    if (modoVento && meteoDataDinamica) {
      if (meteoDataDinamica.windSpeed) {
        setVelocidadeVento(meteoDataDinamica.windSpeed.toString());
      }
      if (meteoDataDinamica.windDirection) {
        setDirecaoVento(meteoDataDinamica.windDirection.toString());
      }
    }

    // Vegetação automática (por região)
    if (modoVegetacao && location) {
      const vegetacaoEstimada = estimarVegetacaoPorRegiao(
        location.latitude,
        location.longitude
      );
      setTipoVegetacao(vegetacaoEstimada);
    }

    // Densidade automática (por tipo de vegetação)
    if (modoDensidade) {
      const params = obterParametrosCombustivel(
        tipoVegetacao.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      );
      setDensidadeCombustivel(params.rho_b.toString());
    }

    // Adicionar ponto ao coletor para inclinação
    if (location?.latitude && location?.longitude && location?.altitude) {
      coletorTerreno.adicionarPonto(
        location.latitude,
        location.longitude,
        location.altitude
      );

      // Inclinação automática
      if (modoInclinacao) {
        const inclinacaoEst = coletorTerreno.obterInclinacaoEstimada();
        if (inclinacaoEst > 0) {
          setInclinacao(Math.round(inclinacaoEst).toString());
        }
      }
    }
  }, [
    location,
    meteoDataDinamica,
    modoAltitude,
    modoInclinacao,
    modoVegetacao,
    modoDensidade,
    modoVento,
    modoPressao,
    tipoVegetacao
  ]);

  // 🧮 Função de cálculo
  const calcularPropagacao = () => {
    setCalculando(true);

    // Validações
    const dadosTerreno = {
      altitude: parseFloat(altitude),
      inclinacao: parseFloat(inclinacao)
    };

    const validacaoTerreno = validarDadosTerreno(dadosTerreno);
    if (!validacaoTerreno.valido) {
      Alert.alert('Erro de Validação', validacaoTerreno.erros.join('\n'));
      setCalculando(false);
      return;
    }

    const validacaoDensidade = validarDensidadeCombustivel(
      parseFloat(densidadeCombustivel)
    );
    if (!validacaoDensidade.valido) {
      Alert.alert('Aviso', validacaoDensidade.aviso);
    }

    // Obter parâmetros de combustível
    const nomeVegetacao = tipoVegetacao
      .replace('_', ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    const paramsCombustivel = obterParametrosCombustivel(nomeVegetacao);

    // Calcular ROS
    const ros = taxaPropagacao(
      paramsCombustivel.IR,
      paramsCombustivel.xi,
      parseFloat(densidadeCombustivel),
      paramsCombustivel.epsilon,
      paramsCombustivel.Q_ig,
      parseFloat(velocidadeVento),
      parseFloat(direcaoVento),
      parseFloat(inclinacao),
      parseFloat(pressaoAtm),
      parseFloat(altitude)
    );

    // Calcular intervalos temporais
    const intervalos = calcularIntervalosTemporais(ros);

    const resultadoCalculo = {
      ros: ros,
      intervalos: intervalos,
      parametrosUsados: {
        altitude: parseFloat(altitude),
        inclinacao: parseFloat(inclinacao),
        vegetacao: nomeVegetacao,
        densidade: parseFloat(densidadeCombustivel),
        vento: parseFloat(velocidadeVento),
        direcaoVento: parseFloat(direcaoVento),
        pressao: parseFloat(pressaoAtm)
      }
    };

    setResultado(resultadoCalculo);
    setPropagacaoResultado(resultadoCalculo); // Passa para o mapa
    setCalculando(false);

    Alert.alert(
      '✅ Cálculo Concluído',
      `Taxa de propagação: ${ros.toFixed(2)} m/min\nVeja a visualização no mapa.`
    );
  };

  // 🎨 Renderização
  const styles = darkMode ? darkStylesLocal : lightStylesLocal;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🔥 PROPAGAÇÃO DE FOCO</Text>
        <Text style={styles.subtitle}>Modelo de Rothermel</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* 📍 SEÇÃO: LOCALIZAÇÃO */}
        <View style={[styles.section, { borderLeftColor: '#2196F3' }]}>
          <Text style={styles.sectionTitle}>📍 LOCALIZAÇÃO</Text>

          {/* Altitude */}
          <View style={styles.paramRow}>
            <View style={styles.paramLabel}>
              <Text style={styles.paramName}>Altitude (m)</Text>
              <Text style={styles.paramSubtext}>
                {modoAltitude ? 'GPS' : 'Manual'}
              </Text>
            </View>
            <Switch
              value={modoAltitude}
              onValueChange={setModoAltitude}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={modoAltitude ? '#fff' : '#f4f3f4'}
            />
            {!modoAltitude && (
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={altitude}
                onChangeText={setAltitude}
                placeholder="850"
              />
            )}
            {modoAltitude && (
              <Text style={styles.valueDisplay}>{altitude} m</Text>
            )}
          </View>

          {/* Inclinação */}
          <View style={styles.paramRow}>
            <View style={styles.paramLabel}>
              <Text style={styles.paramName}>Inclinação (%)</Text>
              <Text style={styles.paramSubtext}>
                {modoInclinacao ? 'Estimado' : 'Manual'}
              </Text>
            </View>
            <Switch
              value={modoInclinacao}
              onValueChange={setModoInclinacao}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={modoInclinacao ? '#fff' : '#f4f3f4'}
            />
            {!modoInclinacao && (
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={inclinacao}
                onChangeText={setInclinacao}
                placeholder="12"
              />
            )}
            {modoInclinacao && (
              <Text style={styles.valueDisplay}>{inclinacao} %</Text>
            )}
          </View>

          {/* Info terreno */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ⛰️ Terreno: {classificarTerreno(parseFloat(altitude))}
            </Text>
          </View>
        </View>

        {/* 🌿 SEÇÃO: VEGETAÇÃO */}
        <View style={[styles.section, { borderLeftColor: '#4CAF50' }]}>
          <Text style={styles.sectionTitle}>🌿 VEGETAÇÃO</Text>

          {/* Tipo de Vegetação */}
          <View style={styles.paramRow}>
            <View style={styles.paramLabel}>
              <Text style={styles.paramName}>Tipo</Text>
              <Text style={styles.paramSubtext}>
                {modoVegetacao ? 'Estimado' : 'Manual'}
              </Text>
            </View>
            <Switch
              value={modoVegetacao}
              onValueChange={setModoVegetacao}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={modoVegetacao ? '#fff' : '#f4f3f4'}
            />
          </View>

          {/* Seletor de vegetação */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {listarTiposVegetacao().map(tipo => (
              <TouchableOpacity
                key={tipo.id}
                style={[
                  styles.vegButton,
                  tipoVegetacao === tipo.id && styles.vegButtonActive
                ]}
                onPress={() => {
                  setTipoVegetacao(tipo.id);
                  setModoVegetacao(false);
                }}
              >
                <Text style={styles.vegEmoji}>{tipo.emoji}</Text>
                <Text style={styles.vegLabel}>{tipo.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Densidade de Combustível */}
          <View style={styles.paramRow}>
            <View style={styles.paramLabel}>
              <Text style={styles.paramName}>Massa Combustível (kg/m³)</Text>
              <Text style={styles.paramSubtext}>
                {modoDensidade ? 'Auto' : 'Manual'}
              </Text>
            </View>
            <Switch
              value={modoDensidade}
              onValueChange={setModoDensidade}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={modoDensidade ? '#fff' : '#f4f3f4'}
            />
            {!modoDensidade && (
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={densidadeCombustivel}
                onChangeText={setDensidadeCombustivel}
                placeholder="25"
              />
            )}
            {modoDensidade && (
              <Text style={styles.valueDisplay}>{densidadeCombustivel} kg/m³</Text>
            )}
          </View>

          {/* Info vegetação */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              {obterDescricaoVegetacao(tipoVegetacao).descricao}
            </Text>
            <Text style={[styles.infoText, { marginTop: 5, fontWeight: 'bold' }]}>
              Risco: {obterDescricaoVegetacao(tipoVegetacao).risco}
            </Text>
          </View>
        </View>

        {/* 🌤️ SEÇÃO: METEOROLOGIA */}
        <View style={[styles.section, { borderLeftColor: '#FF9800' }]}>
          <Text style={styles.sectionTitle}>🌤️ METEOROLOGIA</Text>

          {/* Velocidade do Vento */}
          <View style={styles.paramRow}>
            <View style={styles.paramLabel}>
              <Text style={styles.paramName}>Velocidade Vento (km/h)</Text>
              <Text style={styles.paramSubtext}>
                {modoVento ? 'Weather API' : 'Manual'}
              </Text>
            </View>
            <Switch
              value={modoVento}
              onValueChange={setModoVento}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={modoVento ? '#fff' : '#f4f3f4'}
            />
            {!modoVento && (
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={velocidadeVento}
                onChangeText={setVelocidadeVento}
                placeholder="18"
              />
            )}
            {modoVento && (
              <Text style={styles.valueDisplay}>{velocidadeVento} km/h</Text>
            )}
          </View>

          {/* Direção do Vento */}
          <View style={styles.paramRow}>
            <View style={styles.paramLabel}>
              <Text style={styles.paramName}>Direção Vento (°)</Text>
              <Text style={styles.paramSubtext}>
                {modoVento ? 'Weather API' : 'Manual'}
              </Text>
            </View>
            {!modoVento && (
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={direcaoVento}
                onChangeText={setDirecaoVento}
                placeholder="45"
              />
            )}
            {modoVento && (
              <Text style={styles.valueDisplay}>{direcaoVento}°</Text>
            )}
          </View>

          {/* Pressão Atmosférica */}
          <View style={styles.paramRow}>
            <View style={styles.paramLabel}>
              <Text style={styles.paramName}>Pressão (hPa)</Text>
              <Text style={styles.paramSubtext}>
                {modoPressao ? 'Calculada' : 'Manual'}
              </Text>
            </View>
            <Switch
              value={modoPressao}
              onValueChange={setModoPressao}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={modoPressao ? '#fff' : '#f4f3f4'}
            />
            {!modoPressao && (
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={pressaoAtm}
                onChangeText={setPressaoAtm}
                placeholder="1013"
              />
            )}
            {modoPressao && (
              <Text style={styles.valueDisplay}>{pressaoAtm} hPa</Text>
            )}
          </View>
        </View>

        {/* 📊 SEÇÃO: RESULTADO */}
        {resultado && (
          <View style={[styles.section, { borderLeftColor: '#F44336', backgroundColor: darkMode ? '#1a3a1a' : '#E8F5E9' }]}>
            <Text style={[styles.sectionTitle, { color: '#2E7D32' }]}>
              ✅ RESULTADO
            </Text>

            <View style={styles.resultBox}>
              <Text style={styles.resultTitle}>Taxa de Propagação</Text>
              <Text style={styles.resultValue}>{resultado.ros.toFixed(2)} m/min</Text>
            </View>

            <Text style={[styles.sectionTitle, { fontSize: 16, marginTop: 15 }]}>
              ⏱️ Projeções Temporais
            </Text>

            {resultado.intervalos.map((intervalo, idx) => (
              <View key={idx} style={styles.intervalRow}>
                <Text style={styles.intervalLabel}>{intervalo.label}</Text>
                <View style={styles.intervalValues}>
                  <Text style={styles.intervalText}>
                    📏 {intervalo.raio.toFixed(0)}m
                  </Text>
                  <Text style={styles.intervalText}>
                    📊 {intervalo.area.toFixed(2)}ha
                  </Text>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.buttonPrimary, { backgroundColor: '#2196F3', marginTop: 15 }]}
              onPress={() => setPage(2)}
            >
              <Text style={styles.buttonText}>🗺️ VER NO MAPA</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Botão Calcular */}
        <TouchableOpacity
          style={[styles.buttonPrimary, { marginTop: 20 }]}
          onPress={calcularPropagacao}
          disabled={calculando}
        >
          <Text style={styles.buttonText}>
            {calculando ? '⏳ Calculando...' : '🔥 CALCULAR PROPAGAÇÃO'}
          </Text>
        </TouchableOpacity>

        {/* Botão Voltar */}
        <TouchableOpacity
          style={[styles.buttonSecondary, { marginTop: 10, marginBottom: 30 }]}
          onPress={() => setPage(1)}
        >
          <Text style={styles.buttonText}>← Voltar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// 🎨 ESTILOS LIGHT
const lightStylesLocal = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  header: {
    backgroundColor: '#D32F2F',
    padding: 20,
    paddingTop: 40,
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF'
  },
  subtitle: {
    fontSize: 14,
    color: '#FFCDD2',
    marginTop: 5
  },
  content: {
    flex: 1,
    padding: 15
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  paramLabel: {
    flex: 1
  },
  paramName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  paramSubtext: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 8,
    padding: 10,
    width: 100,
    marginLeft: 10,
    fontSize: 16,
    textAlign: 'center'
  },
  valueDisplay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 10,
    minWidth: 80,
    textAlign: 'right'
  },
  infoBox: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginTop: 10
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20
  },
  vegButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 100
  },
  vegButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50'
  },
  vegEmoji: {
    fontSize: 28,
    marginBottom: 5
  },
  vegLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center'
  },
  resultBox: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50'
  },
  resultTitle: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 5
  },
  resultValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32'
  },
  intervalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  intervalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 60
  },
  intervalValues: {
    flexDirection: 'row',
    gap: 15
  },
  intervalText: {
    fontSize: 14,
    color: '#555'
  },
  buttonPrimary: {
    backgroundColor: '#D32F2F',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3
  },
  buttonSecondary: {
    backgroundColor: '#757575',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center'
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

// 🎨 ESTILOS DARK
const darkStylesLocal = StyleSheet.create({
  ...lightStylesLocal,
  container: {
    ...lightStylesLocal.container,
    backgroundColor: '#121212'
  },
  header: {
    ...lightStylesLocal.header,
    backgroundColor: '#1a1a1a'
  },
  content: {
    ...lightStylesLocal.content,
    backgroundColor: '#121212'
  },
  section: {
    ...lightStylesLocal.section,
    backgroundColor: '#1E1E1E',
    shadowColor: '#000',
    shadowOpacity: 0.5
  },
  sectionTitle: {
    ...lightStylesLocal.sectionTitle,
    color: '#E0E0E0'
  },
  paramName: {
    ...lightStylesLocal.paramName,
    color: '#E0E0E0'
  },
  paramSubtext: {
    ...lightStylesLocal.paramSubtext,
    color: '#9E9E9E'
  },
  input: {
    ...lightStylesLocal.input,
    backgroundColor: '#2A2A2A',
    borderColor: '#424242',
    color: '#FFF'
  },
  valueDisplay: {
    ...lightStylesLocal.valueDisplay,
    color: '#4CAF50'
  },
  infoBox: {
    ...lightStylesLocal.infoBox,
    backgroundColor: '#2A2A2A'
  },
  infoText: {
    ...lightStylesLocal.infoText,
    color: '#B0B0B0'
  },
  vegButton: {
    ...lightStylesLocal.vegButton,
    backgroundColor: '#2A2A2A',
    borderColor: '#424242'
  },
  vegButtonActive: {
    ...lightStylesLocal.vegButtonActive,
    backgroundColor: '#1a3a1a',
    borderColor: '#4CAF50'
  },
  vegLabel: {
    ...lightStylesLocal.vegLabel,
    color: '#E0E0E0'
  },
  resultBox: {
    ...lightStylesLocal.resultBox,
    backgroundColor: '#1a3a1a'
  },
  intervalRow: {
    ...lightStylesLocal.intervalRow,
    backgroundColor: '#2A2A2A',
    borderColor: '#424242'
  },
  intervalLabel: {
    ...lightStylesLocal.intervalLabel,
    color: '#E0E0E0'
  },
  intervalText: {
    ...lightStylesLocal.intervalText,
    color: '#B0B0B0'
  }
});
