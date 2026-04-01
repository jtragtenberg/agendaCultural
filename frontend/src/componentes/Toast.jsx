import { useEffect } from 'react';

export default function Toast({ mensagem, tipo = 'sucesso', onFechar }) {
  useEffect(() => {
    if (!mensagem) return;
    const t = setTimeout(onFechar, 4000);
    return () => clearTimeout(t);
  }, [mensagem, onFechar]);

  if (!mensagem) return null;

  return (
    <div className={`toast toast-${tipo}`} role="alert">
      <span>{mensagem}</span>
      <button className="toast-fechar" onClick={onFechar} aria-label="Fechar">✕</button>
    </div>
  );
}
