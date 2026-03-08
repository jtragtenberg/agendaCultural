import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const nomesMeses = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];

const nomesSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function chaveData(ano, mes, dia) {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function dataParaChave(dataEntrada) {
  const data = new Date(dataEntrada);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function dataInicial(agenda) {
  const primeiroEvento = agenda?.agendaPropria?.[0]?.evento?.data;
  if (!primeiroEvento) {
    const hoje = new Date();
    return { ano: hoje.getFullYear(), mes: hoje.getMonth() };
  }

  const [ano, mes] = primeiroEvento.slice(0, 7).split('-').map(Number);
  return { ano, mes: mes - 1 };
}

export default function CalendarioAgenda({ agenda }) {
  const inicial = dataInicial(agenda);
  const [referencia, setReferencia] = useState(new Date(inicial.ano, inicial.mes, 1));
  const hojeChave = dataParaChave(new Date());

  const eventosPorDia = useMemo(() => {
    const mapa = new Map();

    agenda.agendaPropria.forEach((item) => {
      const chave = dataParaChave(item.evento.data);
      const atual = mapa.get(chave) || [];
      atual.push({
        id: item.id,
        eventoId: item.evento.id,
        titulo: item.evento.titulo,
        horaInicio: item.evento.horaInicio,
        local: item.evento.local.nome,
        origem: 'minha'
      });
      mapa.set(chave, atual);
    });

    return mapa;
  }, [agenda]);

  const ano = referencia.getFullYear();
  const mes = referencia.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();

  const celulas = [];
  for (let i = 0; i < primeiroDiaSemana; i += 1) celulas.push(null);
  for (let dia = 1; dia <= totalDias; dia += 1) celulas.push(dia);

  function mudarMes(delta) {
    setReferencia(new Date(ano, mes + delta, 1));
  }

  return (
    <section className="calendario-agenda">
      <div className="calendario-topo">
        <button onClick={() => mudarMes(-1)}>Mês anterior</button>
        <h3>
          {nomesMeses[mes]} de {ano}
        </h3>
        <button onClick={() => mudarMes(1)}>Próximo mês</button>
      </div>

      <div className="calendario-grade calendario-semana">
        {nomesSemana.map((nome) => (
          <div key={nome} className="calendario-dia-semana">
            {nome}
          </div>
        ))}
      </div>

      <div className="calendario-grade calendario-dias">
        {celulas.map((dia, indice) => {
          if (!dia) {
            return <div key={`vazio-${indice}`} className="calendario-celula calendario-celula-vazia" />;
          }

          const chave = chaveData(ano, mes, dia);
          const eventosDia = eventosPorDia.get(chave) || [];
          const ehHoje = chave === hojeChave;

          return (
            <div key={chave} className={`calendario-celula${ehHoje ? ' calendario-celula-hoje' : ''}`}>
              <div className="calendario-numero">{dia}</div>
              <div className="calendario-eventos-dia">
                {eventosDia.map((evento) => (
                  <article
                    key={evento.id}
                    className={`evento-mini${chave < hojeChave ? ' evento-passado' : ''}`}
                  >
                    <p className="evento-mini-titulo">
                      <Link to={`/evento/${evento.eventoId}`}>{evento.titulo}</Link>
                    </p>
                    <p>
                      {evento.horaInicio} - {evento.local}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
