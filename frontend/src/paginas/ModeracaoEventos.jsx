import { useEffect, useState } from 'react';
import { api } from '../servicos/api';

export default function ModeracaoEventos({ token, ehModerador }) {
  const [aba, setAba] = useState('eventos');
  const [eventos, setEventos] = useState([]);
  const [locais, setLocais] = useState([]);
  const [artistas, setArtistas] = useState([]);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  const [editandoEventoId, setEditandoEventoId] = useState(null);
  const [formEvento, setFormEvento] = useState({
    titulo: '',
    descricao: '',
    localId: '',
    data: '',
    horaInicio: '',
    horaFim: '',
    status: 'pendente'
  });

  const [editandoLocalId, setEditandoLocalId] = useState(null);
  const [formLocal, setFormLocal] = useState({
    nome: '',
    endereco: '',
    bairro: '',
    cidade: '',
    latitude: '',
    longitude: ''
  });

  const [editandoArtistaId, setEditandoArtistaId] = useState(null);
  const [formArtista, setFormArtista] = useState({
    nome: '',
    descricao: '',
    instagram: '',
    website: ''
  });

  async function carregarTudo() {
    if (!token || !ehModerador) return;

    try {
      const [dadosEventos, dadosLocais, dadosArtistas] = await Promise.all([
        api.listarEventosNaoModerados(token),
        api.listarLocaisModeracao(token),
        api.listarArtistasModeracao(token)
      ]);
      setEventos(dadosEventos);
      setLocais(dadosLocais);
      setArtistas(dadosArtistas);
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => {
    carregarTudo();
  }, [token, ehModerador]);

  function limparFeedback() {
    setErro('');
    setMensagem('');
  }

  async function aprovar(id) {
    limparFeedback();
    try {
      await api.aprovarEvento(id, token);
      setMensagem('Evento aprovado.');
      await carregarTudo();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function rejeitar(id) {
    limparFeedback();
    try {
      await api.rejeitarEvento(id, token);
      setMensagem('Evento rejeitado.');
      await carregarTudo();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function apagarEvento(id) {
    limparFeedback();
    try {
      await api.apagarEventoModeracao(id, token);
      setMensagem('Evento apagado com sucesso.');
      await carregarTudo();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function salvarEvento(id) {
    limparFeedback();
    try {
      await api.editarEventoModeracao(
        id,
        {
          ...formEvento,
          data: `${formEvento.data}T00:00:00.000Z`
        },
        token
      );
      setMensagem('Evento atualizado.');
      setEditandoEventoId(null);
      await carregarTudo();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function apagarLocal(id) {
    limparFeedback();
    try {
      await api.apagarLocalModeracao(id, token);
      setMensagem('Local apagado com sucesso.');
      await carregarTudo();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function salvarLocal(id) {
    limparFeedback();
    try {
      await api.editarLocalModeracao(
        id,
        {
          ...formLocal,
          latitude: formLocal.latitude === '' ? null : Number(formLocal.latitude),
          longitude: formLocal.longitude === '' ? null : Number(formLocal.longitude)
        },
        token
      );
      setMensagem('Local atualizado.');
      setEditandoLocalId(null);
      await carregarTudo();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function apagarArtista(id) {
    limparFeedback();
    try {
      await api.apagarArtistaModeracao(id, token);
      setMensagem('Artista apagado com sucesso.');
      await carregarTudo();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function salvarArtista(id) {
    limparFeedback();
    try {
      await api.editarArtistaModeracao(id, formArtista, token);
      setMensagem('Artista atualizado.');
      setEditandoArtistaId(null);
      await carregarTudo();
    } catch (e) {
      setErro(e.message);
    }
  }

  if (!token || !ehModerador) {
    return (
      <main className="container painel-moderacao">
        <h2>Moderação de Conteúdo</h2>
        <p>Área disponível apenas para perfis de moderador.</p>
      </main>
    );
  }

  return (
    <main className="container painel-moderacao">
      <h2>Moderação de Conteúdo</h2>
      <div className="acoes-card">
        <button onClick={() => setAba('eventos')}>Eventos</button>
        <button onClick={() => setAba('locais')}>Locais</button>
        <button onClick={() => setAba('artistas')}>Artistas</button>
      </div>

      {aba === 'eventos' ? (
        <section className="lista-eventos">
          {eventos.map((evento) => (
            <article key={evento.id} className="card-evento moderacao-card">
              <h3>{evento.titulo}</h3>
              <p>{evento.descricao}</p>
              <p>
                <strong>Status:</strong> {evento.status}
              </p>
              <p>
                <strong>Denúncias:</strong> {evento._count?.denuncias || 0}
              </p>
              <p>
                <strong>Criado por:</strong> {evento.criador?.nome}
              </p>
              <p>
                <strong>Data/Hora:</strong> {new Date(evento.data).toLocaleDateString('pt-BR')} - {evento.horaInicio}
              </p>
              <p>
                <strong>Local:</strong> {evento.local?.nome}
              </p>

              <div className="acoes-card">
                <button onClick={() => aprovar(evento.id)}>Aprovar</button>
                <button onClick={() => rejeitar(evento.id)}>Rejeitar</button>
                <button
                  onClick={() => {
                    setEditandoEventoId(evento.id);
                    setFormEvento({
                      titulo: evento.titulo || '',
                      descricao: evento.descricao || '',
                      localId: evento.localId || '',
                      data: (evento.data || '').slice(0, 10),
                      horaInicio: evento.horaInicio || '',
                      horaFim: evento.horaFim || '',
                      status: evento.status || 'pendente'
                    });
                  }}
                >
                  Editar
                </button>
                <button onClick={() => apagarEvento(evento.id)}>Apagar</button>
              </div>

              {evento.denuncias?.length ? (
                <section className="moderacao-denuncias">
                  <strong>Últimas denúncias</strong>
                  <ul>
                    {evento.denuncias.map((denuncia) => (
                      <li key={denuncia.id}>
                        {denuncia.denunciante?.nome || 'Usuário'}: {denuncia.motivo}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {editandoEventoId === evento.id ? (
                <section className="formulario moderacao-form">
                  <input
                    value={formEvento.titulo}
                    onChange={(e) => setFormEvento((a) => ({ ...a, titulo: e.target.value }))}
                    placeholder="Título"
                  />
                  <textarea
                    value={formEvento.descricao}
                    onChange={(e) => setFormEvento((a) => ({ ...a, descricao: e.target.value }))}
                    placeholder="Descrição"
                  />
                  <select
                    value={formEvento.localId}
                    onChange={(e) => setFormEvento((a) => ({ ...a, localId: e.target.value }))}
                  >
                    {locais.map((local) => (
                      <option key={local.id} value={local.id}>
                        {local.nome}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={formEvento.data}
                    onChange={(e) => setFormEvento((a) => ({ ...a, data: e.target.value }))}
                  />
                  <input
                    type="time"
                    value={formEvento.horaInicio}
                    onChange={(e) => setFormEvento((a) => ({ ...a, horaInicio: e.target.value }))}
                  />
                  <input
                    type="time"
                    value={formEvento.horaFim}
                    onChange={(e) => setFormEvento((a) => ({ ...a, horaFim: e.target.value }))}
                  />
                  <select
                    value={formEvento.status}
                    onChange={(e) => setFormEvento((a) => ({ ...a, status: e.target.value }))}
                  >
                    <option value="pendente">pendente</option>
                    <option value="aprovado">aprovado</option>
                    <option value="rejeitado">rejeitado</option>
                    <option value="sinalizado">sinalizado</option>
                  </select>
                  <div className="acoes-card">
                    <button onClick={() => salvarEvento(evento.id)}>Salvar edição</button>
                    <button onClick={() => setEditandoEventoId(null)}>Cancelar</button>
                  </div>
                </section>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {aba === 'locais' ? (
        <section className="lista-eventos">
          {locais.map((local) => (
            <article key={local.id} className="card-evento moderacao-card">
              <h3>{local.nome}</h3>
              <p>{local.endereco}</p>
              <p>
                <strong>Bairro:</strong> {local.bairro} | <strong>Cidade:</strong> {local.cidade}
              </p>
              <p>
                <strong>Eventos vinculados:</strong> {local._count?.eventos || 0}
              </p>
              <div className="acoes-card">
                <button
                  onClick={() => {
                    setEditandoLocalId(local.id);
                    setFormLocal({
                      nome: local.nome || '',
                      endereco: local.endereco || '',
                      bairro: local.bairro || '',
                      cidade: local.cidade || '',
                      latitude: local.latitude ?? '',
                      longitude: local.longitude ?? ''
                    });
                  }}
                >
                  Editar
                </button>
                <button onClick={() => apagarLocal(local.id)}>Apagar</button>
              </div>

              {editandoLocalId === local.id ? (
                <section className="formulario moderacao-form">
                  <input value={formLocal.nome} onChange={(e) => setFormLocal((a) => ({ ...a, nome: e.target.value }))} />
                  <input
                    value={formLocal.endereco}
                    onChange={(e) => setFormLocal((a) => ({ ...a, endereco: e.target.value }))}
                  />
                  <input
                    value={formLocal.bairro}
                    onChange={(e) => setFormLocal((a) => ({ ...a, bairro: e.target.value }))}
                  />
                  <input
                    value={formLocal.cidade}
                    onChange={(e) => setFormLocal((a) => ({ ...a, cidade: e.target.value }))}
                  />
                  <input
                    type="number"
                    step="0.0000001"
                    value={formLocal.latitude}
                    onChange={(e) => setFormLocal((a) => ({ ...a, latitude: e.target.value }))}
                  />
                  <input
                    type="number"
                    step="0.0000001"
                    value={formLocal.longitude}
                    onChange={(e) => setFormLocal((a) => ({ ...a, longitude: e.target.value }))}
                  />
                  <div className="acoes-card">
                    <button onClick={() => salvarLocal(local.id)}>Salvar edição</button>
                    <button onClick={() => setEditandoLocalId(null)}>Cancelar</button>
                  </div>
                </section>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {aba === 'artistas' ? (
        <section className="lista-eventos">
          {artistas.map((artista) => (
            <article key={artista.id} className="card-evento moderacao-card">
              <h3>{artista.nome}</h3>
              <p>{artista.descricao || 'Sem descrição'}</p>
              <p>
                <strong>Vínculos em eventos:</strong> {artista._count?.eventoArtistas || 0}
              </p>
              <div className="acoes-card">
                <button
                  onClick={() => {
                    setEditandoArtistaId(artista.id);
                    setFormArtista({
                      nome: artista.nome || '',
                      descricao: artista.descricao || '',
                      instagram: artista.instagram || '',
                      website: artista.website || ''
                    });
                  }}
                >
                  Editar
                </button>
                <button onClick={() => apagarArtista(artista.id)}>Apagar</button>
              </div>

              {editandoArtistaId === artista.id ? (
                <section className="formulario moderacao-form">
                  <input
                    value={formArtista.nome}
                    onChange={(e) => setFormArtista((a) => ({ ...a, nome: e.target.value }))}
                  />
                  <textarea
                    value={formArtista.descricao}
                    onChange={(e) => setFormArtista((a) => ({ ...a, descricao: e.target.value }))}
                  />
                  <input
                    value={formArtista.instagram}
                    onChange={(e) => setFormArtista((a) => ({ ...a, instagram: e.target.value }))}
                  />
                  <input
                    value={formArtista.website}
                    onChange={(e) => setFormArtista((a) => ({ ...a, website: e.target.value }))}
                  />
                  <div className="acoes-card">
                    <button onClick={() => salvarArtista(artista.id)}>Salvar edição</button>
                    <button onClick={() => setEditandoArtistaId(null)}>Cancelar</button>
                  </div>
                </section>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {mensagem ? <p className="sucesso">{mensagem}</p> : null}
      {erro ? <p className="erro">{erro}</p> : null}
    </main>
  );
}
