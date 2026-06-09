import { ImagePlus, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  criarAssunto,
  criarDisciplina,
  criarSubassunto,
  listarAssuntos,
  listarDisciplinas,
  listarSubassuntos,
} from '../../services/questoesService.js';
import { removerImagemQuestaoStorage, uploadImagemQuestao } from '../../services/firebase/questaoImagensStorageService.js';
import { normalizarImagensQuestao } from '../../utils/questionImages.js';
import QuickCreateSelect from '../forms/QuickCreateSelect.jsx';
import TagInput from '../tags/TagInput.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';
import QuestaoPreview from './QuestaoPreview.jsx';
import { dificuldadeOptions, statusOptions, tipoOptions } from './QuestaoFilters.jsx';

const bloomOptions = [
  { value: 'lembrar', label: 'Lembrar' },
  { value: 'compreender', label: 'Compreender' },
  { value: 'aplicar', label: 'Aplicar' },
  { value: 'analisar', label: 'Analisar' },
  { value: 'avaliar', label: 'Avaliar' },
  { value: 'criar', label: 'Criar' },
];

const questaoInicial = {
  disciplinaId: '',
  assuntoId: '',
  subassuntoId: '',
  tipo: 'discursiva',
  textoAntesCodigo: '',
  codigo: '',
  enunciado: '',
  alternativas: [],
  dificuldade: '',
  fonte: '',
  competencia: '',
  nivelBloom: '',
  tags: [],
  respostaCorreta: '',
  explicacao: '',
  observacaoPedagogica: '',
  status: 'ativa',
  imagens: [],
  anexos: [],
};

function toFormData(questao) {
  if (!questao) {
    return { ...questaoInicial };
  }

  return {
    ...questaoInicial,
    ...questao,
    disciplinaId: questao.disciplinaId || '',
    assuntoId: questao.assuntoId || '',
    subassuntoId: questao.subassuntoId || '',
    dificuldade: questao.dificuldade === 'media' ? 'medio' : questao.dificuldade || '',
    tags: questao.tagsNomes || questao.tags || [],
    alternativas: Array.isArray(questao.alternativas) ? questao.alternativas : [],
    imagens: normalizarImagensQuestao(questao.imagens),
  };
}

function alternativaVazia(index) {
  return {
    id: String.fromCharCode(97 + index),
    texto: '',
    correta: false,
  };
}

function enunciadoCodigo(questao) {
  return [questao.textoAntesCodigo, questao.codigo]
    .map((item) => (item || '').toString().trim())
    .filter(Boolean)
    .join('\n\n');
}

function enunciadoParaSalvar(questao) {
  if (questao.tipo !== 'codigo_analise') {
    return (questao.enunciado || '').trim();
  }

  return enunciadoCodigo(questao) || (questao.enunciado || '').trim();
}

function addOrReplaceById(items, nextItem) {
  if (items.some((item) => item.id === nextItem.id)) {
    return items.map((item) => (item.id === nextItem.id ? nextItem : item));
  }

  return [...items, nextItem];
}

export default function QuestaoForm({
  initialData,
  mode = 'create',
  onSubmit,
}) {
  const [form, setForm] = useState(() => toFormData(initialData));
  const [opcoes, setOpcoes] = useState({ disciplinas: [], assuntos: [], subassuntos: [] });
  const [savingAction, setSavingAction] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadedImagePaths, setUploadedImagePaths] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(toFormData(initialData));
    setUploadedImagePaths([]);
  }, [initialData]);

  useEffect(() => {
    async function loadOptions() {
      const [disciplinas, assuntos, subassuntos] = await Promise.all([
        listarDisciplinas(),
        listarAssuntos(),
        listarSubassuntos(),
      ]);

      setOpcoes({ disciplinas, assuntos, subassuntos });
    }

    loadOptions().catch((apiError) => setError(apiError.message));
  }, []);

  const assuntoOptions = useMemo(() => opcoes.assuntos
    .filter((assunto) => !form.disciplinaId || assunto.disciplinaId === form.disciplinaId)
    .map((assunto) => ({ value: assunto.id, label: assunto.nome })), [opcoes.assuntos, form.disciplinaId]);

  const subassuntoOptions = useMemo(() => opcoes.subassuntos
    .filter((subassunto) => !form.assuntoId || subassunto.assuntoId === form.assuntoId)
    .map((subassunto) => ({ value: subassunto.id, label: subassunto.nome })), [opcoes.subassuntos, form.assuntoId]);

  const update = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'tipo' && value === 'codigo_analise' && !current.textoAntesCodigo && !current.codigo && current.enunciado
        ? { textoAntesCodigo: current.enunciado }
        : {}),
      ...(field === 'tipo' && value !== 'codigo_analise' && current.tipo === 'codigo_analise'
        ? { enunciado: enunciadoParaSalvar(current) }
        : {}),
      ...(field === 'disciplinaId' ? { assuntoId: '', subassuntoId: '' } : {}),
      ...(field === 'assuntoId' ? { subassuntoId: '' } : {}),
      ...(field === 'tipo' && value === 'multipla_escolha' && current.alternativas.length === 0
        ? { alternativas: [alternativaVazia(0), alternativaVazia(1), alternativaVazia(2)] }
        : {}),
      ...(field === 'tipo' && value !== 'multipla_escolha' ? { alternativas: [] } : {}),
    }));
  };

  async function handleCreateDisciplina(nome) {
    const disciplina = await criarDisciplina({ nome });
    setOpcoes((current) => ({ ...current, disciplinas: addOrReplaceById(current.disciplinas, disciplina) }));
    update('disciplinaId', disciplina.id);
  }

  async function handleCreateAssunto(nome) {
    const assunto = await criarAssunto({ nome, disciplinaId: form.disciplinaId });
    setOpcoes((current) => ({ ...current, assuntos: addOrReplaceById(current.assuntos, assunto) }));
    update('assuntoId', assunto.id);
  }

  async function handleCreateSubassunto(nome) {
    const subassunto = await criarSubassunto({ nome, disciplinaId: form.disciplinaId, assuntoId: form.assuntoId });
    setOpcoes((current) => ({ ...current, subassuntos: addOrReplaceById(current.subassuntos, subassunto) }));
    update('subassuntoId', subassunto.id);
  }

  function addAlternativa() {
    setForm((current) => ({
      ...current,
      alternativas: [...current.alternativas, alternativaVazia(current.alternativas.length)],
    }));
  }

  function updateAlternativa(index, field, value) {
    setForm((current) => {
      const baseAlternativas = current.alternativas.length
        ? current.alternativas
        : [alternativaVazia(0), alternativaVazia(1), alternativaVazia(2)];
      const alternativas = baseAlternativas.map((alternativa, alternativaIndex) => {
        if (alternativaIndex !== index) {
          return field === 'correta' && value ? { ...alternativa, correta: false } : alternativa;
        }

        return { ...alternativa, [field]: value };
      });

      const correta = alternativas.find((alternativa) => alternativa.correta);

      return {
        ...current,
        alternativas,
        respostaCorreta: correta ? correta.texto : '',
      };
    });
  }

  function removeAlternativa(index) {
    setForm((current) => {
      const alternativas = current.alternativas.filter((_, alternativaIndex) => alternativaIndex !== index);
      const correta = alternativas.find((alternativa) => alternativa.correta);

      return {
        ...current,
        alternativas,
        respostaCorreta: correta ? correta.texto : '',
      };
    });
  }

  async function handleImageUpload(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (!files.length) return;

    setUploadingImages(true);
    setError('');
    setFeedback('');

    const uploaded = [];
    const errors = [];

    for (const file of files) {
      try {
        uploaded.push(await uploadImagemQuestao(file));
      } catch (apiError) {
        errors.push(apiError.message || `Falha ao enviar ${file.name}.`);
      }
    }

    try {
      if (uploaded.length) {
        setForm((current) => ({
          ...current,
          imagens: [...normalizarImagensQuestao(current.imagens), ...uploaded],
        }));
        setUploadedImagePaths((current) => [...new Set([...current, ...uploaded.map((imagem) => imagem.path).filter(Boolean)])]);
        setFeedback(uploaded.length === 1 ? 'Imagem enviada.' : `${uploaded.length} imagens enviadas.`);
      }

      if (errors.length) {
        setError(errors.join(' '));
      }
    } finally {
      setUploadingImages(false);
    }
  }

  function updateImagem(index, field, value) {
    setForm((current) => ({
      ...current,
      imagens: normalizarImagensQuestao(current.imagens).map((imagem, imagemIndex) => (
        imagemIndex === index ? { ...imagem, [field]: value } : imagem
      )),
    }));
  }

  async function removeImagem(index) {
    const imagens = normalizarImagensQuestao(form.imagens);
    const imagem = imagens[index];

    if (!imagem) return;

    setForm((current) => ({
      ...current,
      imagens: normalizarImagensQuestao(current.imagens).filter((_, imagemIndex) => imagemIndex !== index),
    }));

    if (imagem.path && uploadedImagePaths.includes(imagem.path)) {
      try {
        await removerImagemQuestaoStorage(imagem.path);
        setUploadedImagePaths((current) => current.filter((path) => path !== imagem.path));
      } catch (apiError) {
        setError(apiError.message || 'Imagem removida da questão, mas não foi possível apagar o arquivo enviado.');
      }
    }
  }

  function validateForm() {
    if (!form.disciplinaId) {
      setError('Selecione uma disciplina.');
      return false;
    }

    if (!form.assuntoId) {
      setError('Selecione um assunto.');
      return false;
    }

    if (!form.tipo) {
      setError('Selecione o tipo da questão.');
      return false;
    }

    if (!enunciadoParaSalvar(form)) {
      setError('Informe o enunciado da questão.');
      return false;
    }

    if (form.tipo === 'multipla_escolha') {
      const alternativasPreenchidas = form.alternativas.filter((alternativa) => alternativa.texto.trim());
      const correta = alternativasPreenchidas.find((alternativa) => alternativa.correta);

      if (alternativasPreenchidas.length < 2) {
        setError('Informe pelo menos duas alternativas preenchidas.');
        return false;
      }

      if (!correta) {
        setError('Marque uma alternativa correta.');
        return false;
      }
    }

    return true;
  }

  async function handleSubmit(event, cadastrarOutra = false) {
    event.preventDefault();
    setError('');
    setFeedback('');

    if (!validateForm()) {
      return;
    }

    setSavingAction(cadastrarOutra ? 'another' : 'save');

    try {
      const payload = {
        ...form,
        textoAntesCodigo: form.tipo === 'codigo_analise' ? form.textoAntesCodigo.trim() : '',
        codigo: form.tipo === 'codigo_analise' ? form.codigo.trim() : '',
        enunciado: enunciadoParaSalvar(form),
        subassuntoId: form.subassuntoId || '',
        dificuldade: form.dificuldade || null,
        nivelBloom: form.nivelBloom || null,
        tags: form.tags,
        imagens: normalizarImagensQuestao(form.imagens),
        alternativas: form.tipo === 'multipla_escolha'
          ? form.alternativas.filter((alternativa) => alternativa.texto.trim())
          : [],
      };

      await onSubmit(payload, { cadastrarOutra });
      setUploadedImagePaths([]);

      if (cadastrarOutra) {
        setFeedback('Questão salva. Você já pode cadastrar outra.');
        setForm({
          ...questaoInicial,
          disciplinaId: form.disciplinaId,
        });
      }
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSavingAction('');
    }
  }

  const imagens = normalizarImagensQuestao(form.imagens);

  return (
    <div className="form-preview-grid">
      <form className="form-panel" onSubmit={(event) => handleSubmit(event, false)}>
        <div className="form-grid">
          <QuickCreateSelect
            label="Disciplina"
            name="disciplinaId"
            value={form.disciplinaId}
            options={opcoes.disciplinas.map((disciplina) => ({ value: disciplina.id, label: disciplina.nome }))}
            createLabel="Nova disciplina"
            requiredMark
            onChange={(value) => update('disciplinaId', value)}
            onCreate={handleCreateDisciplina}
          />
          <QuickCreateSelect
            label="Assunto"
            name="assuntoId"
            value={form.assuntoId}
            options={assuntoOptions}
            disabled={!form.disciplinaId}
            createLabel="Novo assunto"
            requiredMark
            onChange={(value) => update('assuntoId', value)}
            onCreate={handleCreateAssunto}
          />
          <QuickCreateSelect
            label="Subassunto opcional"
            name="subassuntoId"
            value={form.subassuntoId}
            options={subassuntoOptions}
            disabled={!form.assuntoId}
            createLabel="Novo subassunto"
            placeholder="Sem subassunto"
            onChange={(value) => update('subassuntoId', value)}
            onCreate={handleCreateSubassunto}
          />
          <Select
            label="Tipo"
            name="tipo"
            value={form.tipo}
            options={tipoOptions}
            requiredMark
            onChange={(event) => update('tipo', event.target.value)}
          />
          {form.tipo === 'codigo_analise' ? (
            <>
              <Textarea
                label="Texto antes do código"
                name="textoAntesCodigo"
                className="span-2"
                rows={4}
                value={form.textoAntesCodigo}
                onChange={(event) => update('textoAntesCodigo', event.target.value)}
                requiredMark
              />
              <Textarea
                label="Código"
                name="codigo"
                className="span-2"
                inputClassName="code-textarea"
                rows={10}
                value={form.codigo}
                onChange={(event) => update('codigo', event.target.value)}
                requiredMark
              />
              {form.enunciado && !form.textoAntesCodigo && !form.codigo ? (
                <Textarea
                  label="Enunciado legado"
                  name="enunciado"
                  className="span-2"
                  rows={5}
                  value={form.enunciado}
                  onChange={(event) => update('enunciado', event.target.value)}
                />
              ) : null}
            </>
          ) : (
            <Textarea
              label="Enunciado"
              name="enunciado"
              className="span-2"
              rows={7}
              value={form.enunciado}
              onChange={(event) => update('enunciado', event.target.value)}
              requiredMark
              required
            />
          )}

          <div className="span-2 question-images-panel">
            <div className="inline-title">
              <div>
                <p className="eyebrow">Imagens</p>
                <h3>Imagens da questão</h3>
              </div>
              <div className="page-actions">
                <label
                  className={`button button-secondary button-md ${uploadingImages ? 'button-disabled' : ''}`}
                  htmlFor="questao-imagens-upload"
                  aria-disabled={uploadingImages}
                >
                  <ImagePlus size={18} aria-hidden="true" />
                  <span>{uploadingImages ? 'Enviando...' : 'Adicionar imagens'}</span>
                </label>
                <input
                  id="questao-imagens-upload"
                  className="visually-hidden"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploadingImages}
                  onChange={handleImageUpload}
                />
              </div>
            </div>

            {imagens.length ? (
              <div className="question-images-list">
                {imagens.map((imagem, index) => (
                  <article className="question-image-editor" key={imagem.path || imagem.url}>
                    <div className="question-image-thumb">
                      <img src={imagem.url} alt={imagem.textoAlternativo || imagem.legenda || imagem.nome || `Imagem ${index + 1} da questão`} />
                    </div>
                    <div className="image-metadata-grid">
                      <Input
                        label="Legenda"
                        name={`imagem-legenda-${index}`}
                        value={imagem.legenda}
                        onChange={(event) => updateImagem(index, 'legenda', event.target.value)}
                      />
                      <Input
                        label="Texto alternativo"
                        name={`imagem-alt-${index}`}
                        value={imagem.textoAlternativo}
                        onChange={(event) => updateImagem(index, 'textoAlternativo', event.target.value)}
                      />
                      <Input
                        label="Fonte da imagem"
                        name={`imagem-fonte-${index}`}
                        value={imagem.fonte}
                        onChange={(event) => updateImagem(index, 'fonte', event.target.value)}
                      />
                    </div>
                    <button type="button" className="icon-button danger" onClick={() => removeImagem(index)} title="Remover imagem">
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted-text">Nenhuma imagem associada à questão.</p>
            )}
          </div>

          {form.tipo === 'multipla_escolha' ? (
            <div className="span-2 alternativas-panel">
              <div className="inline-title">
                <div>
                  <p className="eyebrow">Alternativas</p>
                  <h3>Múltipla escolha</h3>
                </div>
                <Button type="button" variant="secondary" icon={Plus} onClick={addAlternativa}>
                  Adicionar
                </Button>
              </div>
              {(form.alternativas.length ? form.alternativas : [alternativaVazia(0), alternativaVazia(1), alternativaVazia(2)]).map((alternativa, index) => (
                <div className="alternativa-row" key={`${alternativa.id}-${index}`}>
                  <input
                    className="input"
                    placeholder={`Alternativa ${String.fromCharCode(65 + index)}`}
                    value={alternativa.texto}
                    onChange={(event) => updateAlternativa(index, 'texto', event.target.value)}
                  />
                  <label className="mini-check">
                    <input
                      type="radio"
                      name="alternativa-correta"
                      checked={Boolean(alternativa.correta)}
                      onChange={(event) => updateAlternativa(index, 'correta', event.target.checked)}
                    />
                    <span>Correta</span>
                  </label>
                  <button type="button" className="icon-button danger" onClick={() => removeAlternativa(index)} title="Remover alternativa">
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {form.tipo === 'arquivo_anexo' ? (
            <div className="span-2 notice-box">Upload de arquivos será implementado em etapa futura.</div>
          ) : null}

          <Select
            label="Dificuldade"
            name="dificuldade"
            value={form.dificuldade}
            options={dificuldadeOptions}
            onChange={(event) => update('dificuldade', event.target.value)}
          />
          <Input
            label="Fonte"
            name="fonte"
            value={form.fonte}
            onChange={(event) => update('fonte', event.target.value)}
          />
          <Input
            label="Competência"
            name="competencia"
            value={form.competencia}
            onChange={(event) => update('competencia', event.target.value)}
          />
          <Select
            label="Nível de Bloom"
            name="nivelBloom"
            value={form.nivelBloom}
            options={bloomOptions}
            onChange={(event) => update('nivelBloom', event.target.value)}
          />
          <div className="span-2">
            <TagInput value={form.tags} onChange={(tags) => update('tags', tags)} />
          </div>
          {form.tipo === 'multipla_escolha' ? (
            <Input
              label="Resposta correta"
              name="respostaCorreta"
              value={form.respostaCorreta}
              placeholder="Marque a alternativa correta"
              readOnly
            />
          ) : form.tipo === 'verdadeiro_falso' ? (
            <Select
              label="Resposta correta"
              name="respostaCorreta"
              value={form.respostaCorreta}
              options={[
                { value: 'verdadeiro', label: 'Verdadeiro' },
                { value: 'falso', label: 'Falso' },
              ]}
              onChange={(event) => update('respostaCorreta', event.target.value)}
            />
          ) : (
            <Input
              label="Resposta correta"
              name="respostaCorreta"
              value={form.respostaCorreta}
              onChange={(event) => update('respostaCorreta', event.target.value)}
            />
          )}
          <Select
            label="Status"
            name="status"
            value={form.status}
            options={statusOptions}
            onChange={(event) => update('status', event.target.value)}
          />
          <Textarea
            label="Explicação"
            name="explicacao"
            rows={4}
            value={form.explicacao}
            onChange={(event) => update('explicacao', event.target.value)}
          />
          <Textarea
            label="Observação pedagógica"
            name="observacaoPedagogica"
            rows={4}
            value={form.observacaoPedagogica}
            onChange={(event) => update('observacaoPedagogica', event.target.value)}
          />
        </div>

        <div className="form-footer">
          {feedback ? <p className="success-message">{feedback}</p> : null}
          {error ? <p className="error-message">{error}</p> : null}
          {mode === 'create' ? (
            <Button
              type="button"
              variant="secondary"
              icon={Plus}
              disabled={Boolean(savingAction) || uploadingImages}
              onClick={(event) => handleSubmit(event, true)}
            >
              {savingAction === 'another' ? 'Salvando...' : 'Salvar e cadastrar outra'}
            </Button>
          ) : null}
          <Button type="submit" icon={Save} disabled={Boolean(savingAction) || uploadingImages}>
            {savingAction === 'save' ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>

      <QuestaoPreview questao={form} />
    </div>
  );
}
