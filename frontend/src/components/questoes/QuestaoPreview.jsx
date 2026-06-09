import Badge from '../ui/Badge.jsx';
import Card from '../ui/Card.jsx';
import { normalizarImagensQuestao } from '../../utils/questionImages.js';
import QuestaoImagens from './QuestaoImagens.jsx';

function hasSeparatedCode(questao) {
  return questao.tipo === 'codigo_analise' && (questao.textoAntesCodigo || questao.codigo);
}

export default function QuestaoPreview({ questao }) {
  const tags = questao.tagsNomes || (Array.isArray(questao.tags) ? questao.tags : questao.tags?.split(',').map((tag) => tag.trim()).filter(Boolean) || []);
  const alternativas = (questao.alternativas || []).filter((alternativa) => alternativa.texto?.trim());
  const imagens = normalizarImagensQuestao(questao.imagens);
  const isLegacyCodeAnalysis = questao.tipo === 'codigo_analise' && !hasSeparatedCode(questao);

  return (
    <Card className="preview-card">
      <div className="section-title">
        <p className="eyebrow">Prévia</p>
        <h2>Questão</h2>
      </div>

      <div className="question-preview-body">
        {hasSeparatedCode(questao) ? (
          <>
            {questao.textoAntesCodigo ? <p className="preview-enunciado">{questao.textoAntesCodigo}</p> : null}
            {questao.codigo ? <pre className="question-code">{questao.codigo}</pre> : null}
          </>
        ) : isLegacyCodeAnalysis ? (
          <pre className="question-code">{questao.enunciado || 'O enunciado aparecerá aqui.'}</pre>
        ) : (
          <p className="preview-enunciado">{questao.enunciado || 'O enunciado aparecerá aqui.'}</p>
        )}

        <QuestaoImagens imagens={imagens} />

        {alternativas.length ? (
          <div className="preview-alternativas">
            {alternativas.map((alternativa, index) => (
              <p key={`${alternativa.id}-${index}`}>
                <strong>{String.fromCharCode(65 + index)}.</strong>
                <span className="alternative-text">{alternativa.texto}</span>
                {alternativa.correta ? <Badge variant="success">Correta</Badge> : null}
              </p>
            ))}
          </div>
        ) : null}

        {questao.tipo === 'verdadeiro_falso' ? (
          <div className="preview-alternativas">
            <p><strong>( )</strong> Verdadeiro</p>
            <p><strong>( )</strong> Falso</p>
          </div>
        ) : null}

        {questao.tipo === 'imagem' && !imagens.length ? (
          <div className="notice-box">Questão marcada como imagem, mas sem imagem associada.</div>
        ) : null}

        {questao.tipo === 'arquivo_anexo' ? (
          <div className="notice-box">Upload de arquivos será implementado em etapa futura.</div>
        ) : null}

        {questao.respostaCorreta ? (
          <div className="answer-box">
            <strong>Resposta</strong>
            <p>{questao.respostaCorreta}</p>
          </div>
        ) : null}

        {questao.explicacao ? (
          <div className="answer-box muted-box">
            <strong>Explicação</strong>
            <p>{questao.explicacao}</p>
          </div>
        ) : null}

        <div className="tag-row">
          {tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}
