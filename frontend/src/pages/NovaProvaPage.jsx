import ProvaBalanceadaForm from '../components/provas/ProvaBalanceadaForm.jsx';
import { criarProva } from '../services/provasService.js';

export default function NovaProvaPage() {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Provas</p>
          <h2>Gerar prova balanceada</h2>
        </div>
      </div>

      <ProvaBalanceadaForm mode="create" onSave={criarProva} />
    </div>
  );
}
