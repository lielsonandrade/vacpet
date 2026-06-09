// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  VacPet
 * @notice Carteirinha de vacinação de animais de estimação registrada na blockchain.
 *         Cada animal recebe um ID único e seu histórico de vacinas fica gravado
 *         de forma imutável, auditável e verificável publicamente.
 *
 * @dev    Desenvolvido para o Hackweb — Desafio 1 ProofChain (Trilha Blockchain).
 *         Rede de deploy: Sepolia Testnet.
 *         Contrato: 0x8BbcbCf15930EE019e81b2B68C05188C8e4FF87F
 *
 * @author Hackweb Desafio 1 — VacPet
 */
contract VacPet {

    // ─────────────────────────────────────────────────────────────────────────
    // ESTRUTURAS DE DADOS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Representa uma vacina aplicada em um animal.
     * @dev    Todos os timestamps são Unix (segundos desde 01/01/1970).
     *         `proximaDose` igual a 0 indica que não há próxima dose prevista.
     */
    struct Vacina {
        string nome;            // Nome da vacina. Ex: "V10", "Antirrábica", "Gripe"
        string lote;            // Número do lote da vacina para rastreabilidade
        uint256 dataAplicacao;  // Timestamp Unix da data de aplicação
        uint256 proximaDose;    // Timestamp Unix da próxima dose (0 se não houver)
        string veterinario;     // Nome e CRMV do veterinário responsável
        string clinica;         // Nome da clínica ou hospital veterinário
    }

    /**
     * @notice Representa um animal cadastrado na blockchain.
     * @dev    O campo `ativo` permite desativar o registro sem apagar o histórico,
     *         preservando a auditabilidade. `criadoEm` é o timestamp do bloco
     *         em que o animal foi cadastrado — prova de existência on-chain.
     */
    struct Animal {
        uint256 id;             // Identificador único sequencial do animal
        string nome;            // Nome do animal. Ex: "Thor", "Mel"
        string especie;         // Espécie. Ex: "Cão", "Gato", "Coelho"
        string raca;            // Raça do animal. Ex: "Labrador", "SRD"
        uint256 dataNascimento; // Timestamp Unix da data de nascimento
        string cor;             // Cor ou pelagem. Ex: "Caramelo", "Preto e branco"
        address tutor;          // Endereço (wallet) do tutor responsável
        bool ativo;             // true = cadastro ativo; false = desativado
        uint256 criadoEm;       // Timestamp Unix do momento do cadastro (block.timestamp)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VARIÁVEIS DE ESTADO
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Contador interno de IDs. Inicia em 1 para que ID 0 nunca seja válido,
    ///      facilitando checagens de existência (id == 0 significa "não existe").
    uint256 private _proximoId = 1;

    /// @notice Mapeia ID do animal para seus dados completos.
    mapping(uint256 => Animal) public animais;

    /// @notice Mapeia ID do animal para seu histórico de vacinas.
    /// @dev    Array dinâmico: cada push adiciona uma nova vacina imutável ao histórico.
    mapping(uint256 => Vacina[]) public vacinas;

    /// @notice Mapeia endereço do tutor para a lista de IDs de seus animais.
    /// @dev    Permite listar todos os animais de um tutor sem iterar o contrato.
    mapping(address => uint256[]) public animaisPorTutor;

    // ─────────────────────────────────────────────────────────────────────────
    // EVENTOS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Emitido quando um novo animal é cadastrado.
     * @param id    ID único gerado para o animal.
     * @param nome  Nome do animal registrado.
     * @param tutor Endereço do tutor que realizou o cadastro.
     */
    event AnimalCadastrado(uint256 indexed id, string nome, address indexed tutor);

    /**
     * @notice Emitido quando uma vacina é registrada para um animal.
     * @param animalId ID do animal vacinado.
     * @param vacina   Nome da vacina aplicada.
     * @param data     Timestamp Unix da aplicação.
     */
    event VacinaRegistrada(uint256 indexed animalId, string vacina, uint256 data);

    /**
     * @notice Emitido quando a tutoria de um animal é transferida.
     * @param animalId ID do animal transferido.
     * @param antigo   Endereço do tutor anterior.
     * @param novo     Endereço do novo tutor.
     */
    event TutorTransferido(uint256 indexed animalId, address antigo, address novo);

    // ─────────────────────────────────────────────────────────────────────────
    // MODIFICADORES
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Garante que apenas o tutor registrado do animal pode executar a função.
     * @param animalId ID do animal a ser verificado.
     */
    modifier apenasTutor(uint256 animalId) {
        require(
            animais[animalId].tutor == msg.sender,
            "VacPet: apenas o tutor pode executar esta acao"
        );
        _;
    }

    /**
     * @notice Garante que o animal com o ID informado existe e está ativo.
     * @param animalId ID do animal a ser verificado.
     */
    modifier animalExiste(uint256 animalId) {
        require(
            animais[animalId].ativo,
            "VacPet: animal nao encontrado ou inativo"
        );
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FUNÇÕES DE ESCRITA (alteram estado — custam gas)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Cadastra um novo animal na blockchain e atribui a tutoria ao remetente.
     * @dev    O ID é gerado automaticamente e incrementado a cada cadastro.
     *         `block.timestamp` é usado como carimbo de tempo imutável do registro.
     *
     * @param nome           Nome do animal.
     * @param especie        Espécie do animal (ex: "Cão", "Gato").
     * @param raca           Raça do animal.
     * @param dataNascimento Data de nascimento em timestamp Unix.
     * @param cor            Cor ou pelagem do animal.
     *
     * @return id O ID único gerado para o animal cadastrado.
     */
    function cadastrarAnimal(
        string calldata nome,
        string calldata especie,
        string calldata raca,
        uint256 dataNascimento,
        string calldata cor
    ) external returns (uint256) {

        // Gera o ID e já incrementa o contador para o próximo cadastro
        uint256 id = _proximoId++;

        // Grava os dados do animal no mapping de estado
        animais[id] = Animal({
            id: id,
            nome: nome,
            especie: especie,
            raca: raca,
            dataNascimento: dataNascimento,
            cor: cor,
            tutor: msg.sender,       // Quem envia a transação é o tutor
            ativo: true,
            criadoEm: block.timestamp // Carimbo de tempo do bloco atual
        });

        // Registra o animal na lista do tutor para consulta reversa
        animaisPorTutor[msg.sender].push(id);

        // Emite evento para indexação off-chain e rastreabilidade
        emit AnimalCadastrado(id, nome, msg.sender);

        return id;
    }

    /**
     * @notice Registra uma vacina aplicada em um animal existente.
     * @dev    Apenas o tutor do animal pode registrar vacinas.
     *         O histórico é append-only: vacinas nunca são removidas ou alteradas.
     *
     * @param animalId      ID do animal que recebeu a vacina.
     * @param nomeVacina    Nome da vacina aplicada (ex: "V10", "Antirrábica").
     * @param lote          Número do lote da vacina para rastreabilidade.
     * @param dataAplicacao Data da aplicação em timestamp Unix.
     * @param proximaDose   Data da próxima dose em timestamp Unix (0 se não houver).
     * @param veterinario   Nome e CRMV do veterinário responsável.
     * @param clinica       Nome da clínica ou hospital veterinário.
     */
    function registrarVacina(
        uint256 animalId,
        string calldata nomeVacina,
        string calldata lote,
        uint256 dataAplicacao,
        uint256 proximaDose,
        string calldata veterinario,
        string calldata clinica
    ) external animalExiste(animalId) apenasTutor(animalId) {

        // Adiciona a vacina ao histórico do animal (append-only, sem remoção)
        vacinas[animalId].push(Vacina({
            nome: nomeVacina,
            lote: lote,
            dataAplicacao: dataAplicacao,
            proximaDose: proximaDose,
            veterinario: veterinario,
            clinica: clinica
        }));

        // Emite evento para rastreabilidade e indexação
        emit VacinaRegistrada(animalId, nomeVacina, dataAplicacao);
    }

    /**
     * @notice Transfere a tutoria de um animal para outro endereço.
     * @dev    Útil em casos de adoção ou venda — o histórico segue o animal.
     *         O animal é adicionado à lista do novo tutor, mas não removido
     *         da lista do antigo (preserva rastreabilidade histórica).
     *
     * @param animalId   ID do animal a ser transferido.
     * @param novoTutor  Endereço do novo tutor (não pode ser address(0)).
     */
    function transferirTutor(
        uint256 animalId,
        address novoTutor
    ) external animalExiste(animalId) apenasTutor(animalId) {

        // Impede transferência para endereço nulo (queimaria a tutoria)
        require(novoTutor != address(0), "VacPet: endereco invalido");

        address antigo = animais[animalId].tutor;

        // Atualiza o tutor no registro do animal
        animais[animalId].tutor = novoTutor;

        // Adiciona o animal à lista do novo tutor
        animaisPorTutor[novoTutor].push(animalId);

        // Emite evento com os dois endereços para rastreabilidade completa
        emit TutorTransferido(animalId, antigo, novoTutor);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FUNÇÕES DE LEITURA (não alteram estado — gratuitas, sem gas)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Retorna todos os dados de um animal pelo seu ID.
     * @dev    Função pública — qualquer endereço pode consultar sem carteira.
     * @param animalId ID do animal a ser consultado.
     * @return Struct Animal com todos os dados do registro.
     */
    function consultarAnimal(uint256 animalId)
        external
        view
        animalExiste(animalId)
        returns (Animal memory)
    {
        return animais[animalId];
    }

    /**
     * @notice Retorna o histórico completo de vacinas de um animal.
     * @dev    Função pública — qualquer endereço pode verificar sem carteira.
     *         Esta é a função central de verificação pública do contrato.
     * @param animalId ID do animal a ser consultado.
     * @return Array de structs Vacina com todo o histórico de vacinação.
     */
    function consultarVacinas(uint256 animalId)
        external
        view
        animalExiste(animalId)
        returns (Vacina[] memory)
    {
        return vacinas[animalId];
    }

    /**
     * @notice Retorna a quantidade total de vacinas registradas para um animal.
     * @param animalId ID do animal a ser consultado.
     * @return Número de vacinas no histórico.
     */
    function totalVacinas(uint256 animalId)
        external
        view
        returns (uint256)
    {
        return vacinas[animalId].length;
    }

    /**
     * @notice Retorna os IDs de todos os animais cadastrados por um tutor.
     * @dev    Permite listar os pets de uma carteira sem varrer o contrato inteiro.
     * @param tutor Endereço da carteira do tutor.
     * @return Array de IDs dos animais vinculados ao tutor.
     */
    function animaisDoTutor(address tutor)
        external
        view
        returns (uint256[] memory)
    {
        return animaisPorTutor[tutor];
    }

    /**
     * @notice Retorna o total de animais já cadastrados no contrato.
     * @dev    Calculado a partir do contador interno (_proximoId - 1),
     *         pois IDs começam em 1.
     * @return Total de animais cadastrados.
     */
    function totalAnimais() external view returns (uint256) {
        return _proximoId - 1;
    }
}
