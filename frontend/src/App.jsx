import { useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Cabecalho from './componentes/Cabecalho';
import Inicio from './paginas/Inicio';
import PaginaEvento from './paginas/PaginaEvento';
import CriarEvento from './paginas/CriarEvento';
import Perfil from './paginas/Perfil';
import PaginaLocal from './paginas/PaginaLocal';
import PaginaArtista from './paginas/PaginaArtista';
import BuscarEventos from './paginas/BuscarEventos';

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

  const token = useMemo(() => sessao?.token, [sessao]);

  return (
    <>
      <Cabecalho usuario={sessao?.usuario} onSair={sair} />

      <Routes>
        <Route path="/" element={<Inicio token={token} />} />
        <Route path="/buscar-eventos" element={<BuscarEventos token={token} />} />
        <Route path="/evento/:id" element={<PaginaEvento token={token} />} />
        <Route path="/locais/:id" element={<PaginaLocal token={token} />} />
        <Route path="/artistas/:id" element={<PaginaArtista token={token} />} />
        <Route path="/criar-evento" element={<CriarEvento token={token} />} />
        <Route path="/perfil" element={<Perfil sessao={sessao} onEntrar={entrar} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
