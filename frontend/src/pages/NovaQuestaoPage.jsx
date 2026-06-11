import { useNavigate } from 'react-router-dom';
import QuestaoForm from '../components/questoes/QuestaoForm.jsx';
import { criarQuestao } from '../services/questoesService.js';

export default function NovaQuestaoPage() {
  const navigate = useNavigate();

  async function handleSubmit(payload, { cadastrarOutra } = {}) {
    const questao = await criarQuestao(payload);

    if (!cadastrarOutra) {
      navigate('/questoes');
    }

    return questao;
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Cadastro</p>
          <h2>Nova questão</h2>
        </div>
      </div>

      <QuestaoForm mode="create" onSubmit={handleSubmit} />
    </div>
  );
}
