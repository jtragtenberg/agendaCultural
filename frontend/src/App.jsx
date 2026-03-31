import { useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Cabecalho from './componentes/Cabecalho';
import ModalExportarAgenda from './componentes/ModalExportarAgenda';
import Home from './paginas/Home';
import PaginaEvento from './paginas/PaginaEvento';
import Perfil from './paginas/Perfil';
import PaginaLocal from './paginas/PaginaLocal';
import PaginaArtista from './paginas/PaginaArtista';
import ModeracaoEventos from './paginas/ModeracaoEventos';
import PaginaInstagram from './paginas/PaginaInstagram';
import Configuracoes from './paginas/Configuracoes';

const chaveSessao = 'agenda-cultural-recife:sessao';

function lerSessao() {
  const bruto = localStorage.getItem(chaveSessao);
  if (!bruto) return null;
  try {
    return JSON.parse(bruto);
  } catch {
    return null;
  }
}

export default function App() {
  const [sessao, setSessao] = useState(() => lerSessao());

  function entrar(dados) {
    setSessao(dados);
    localStorage.setItem(chaveSessao, JSON.stringify(dados));
  }

  function sair() {
    setSessao(null);
    localStorage.removeItem(chaveSessao);
  }

  function atualizarUsuario(novosDados) {
    setSessao((ant) => {
      const nova = { ...ant, usuario: { ...ant.usuario, ...novosDados } };
      localStorage.setItem(chaveSessao, JSON.stringify(nova));
      return nova;
    });
  }

  const [modalExportar, setModalExportar] = useState(false);

  const token = useMemo(() => sessao?.token, [sessao]);
  const ehModerador = useMemo(
    () => Boolean(sessao?.usuario?.verificado || Number(sessao?.usuario?.reputacao || 0) >= 200),
    [sessao]
  );

  return (
    <>
      <Cabecalho
        usuario={sessao?.usuario}
        onSair={sair}
        ehModerador={ehModerador}
        onExportarAgenda={() => setModalExportar(true)}
      />

      <Routes>
        <Route path="/" element={<Home token={token} />} />
        <Route path="/moderacao" element={<ModeracaoEventos token={token} ehModerador={ehModerador} />} />
        <Route path="/evento/:id" element={<PaginaEvento token={token} />} />
        <Route path="/locais/:id" element={<PaginaLocal token={token} />} />
        <Route path="/artistas/:id" element={<PaginaArtista token={token} />} />
        <Route path="/perfil" element={<Perfil sessao={sessao} onEntrar={entrar} />} />
        <Route path="/configuracoes" element={<Configuracoes sessao={sessao} token={token} onAtualizarUsuario={atualizarUsuario} />} />
        <Route path="/instagram" element={<PaginaInstagram />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {modalExportar ? (
        <ModalExportarAgenda token={token} onFechar={() => setModalExportar(false)} />
      ) : null}
    </>
  );
}
