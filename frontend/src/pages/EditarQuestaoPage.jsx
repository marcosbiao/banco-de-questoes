import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QuestaoForm from '../components/questoes/QuestaoForm.jsx';
import ErrorMessage from '../components/ui/ErrorMessage.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';
import { atualizarQuestao, buscarQuestao } from '../services/questoesService.js';

export default function EditarQuestaoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [questao, setQuestao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadQuestao() {
      setLoading(true);
      setError('');

      try {
        const data = await buscarQuestao(id);
        setQuestao(data);
      } catch (apiError) {
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    }

    loadQuestao();
  }, [id]);

  async function handleSubmit(payload) {
    const questaoAtualizada = await atualizarQuestao(id, payload);
    navigate('/questoes');
    return questaoAtualizada;
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Edição</p>
          <h2>Editar questão</h2>
        </div>
      </div>

      {loading ? <LoadingState message="Carregando questão..." /> : null}
      <ErrorMessage message={error} />
      {!loading && !error && questao ? (
        <QuestaoForm mode="edit" initialData={questao} onSubmit={handleSubmit} />
      ) : null}
    </div>
  );
}
