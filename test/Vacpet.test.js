// SPDX-License-Identifier: MIT
/**
 * @title  Testes automatizados — VacPet
 * @notice Cobertura completa das funções de escrita e leitura do contrato VacPet.
 *         Framework: Hardhat + Ethers v6 + Chai
 *
 * Para rodar:
 *   npx hardhat test
 *   npx hardhat test --grep "cadastrarAnimal"   # roda apenas um grupo
 *   npx hardhat coverage                        # relatório de cobertura
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Converte uma data legível em timestamp Unix (segundos). */
const toTimestamp = (dateStr) => Math.floor(new Date(dateStr).getTime() / 1000);

/** Dados padrão de um animal para reuso nos testes. */
const ANIMAL_PADRAO = {
  nome: "Thor",
  especie: "Cão",
  raca: "Labrador",
  dataNascimento: toTimestamp("2020-03-15"),
  cor: "Caramelo",
};

/** Dados padrão de uma vacina para reuso nos testes. */
const VACINA_PADRAO = {
  nomeVacina: "V10",
  lote: "LOTE-2024-001",
  dataAplicacao: toTimestamp("2024-01-10"),
  proximaDose: toTimestamp("2025-01-10"),
  veterinario: "Dr. João Silva - CRMV 12345",
  clinica: "Clínica VetPlus",
};

// ─────────────────────────────────────────────────────────────────────────────
// SUITE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

describe("VacPet", function () {
  let vacPet;
  let owner, tutor1, tutor2, terceiro;

  /**
   * Antes de cada teste: faz deploy de uma instância limpa do contrato
   * e distribui os signers (contas simuladas da rede local Hardhat).
   */
  beforeEach(async function () {
    [owner, tutor1, tutor2, terceiro] = await ethers.getSigners();
    const VacPet = await ethers.getContractFactory("VacPet");
    vacPet = await VacPet.deploy();
    await vacPet.waitForDeployment();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // DEPLOY
  // ───────────────────────────────────────────────────────────────────────────

  describe("Deploy", function () {
    it("deve fazer deploy com sucesso e expor o endereço do contrato", async function () {
      const addr = await vacPet.getAddress();
      expect(addr).to.be.properAddress;
    });

    it("deve inicializar com totalAnimais = 0", async function () {
      expect(await vacPet.totalAnimais()).to.equal(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // cadastrarAnimal
  // ───────────────────────────────────────────────────────────────────────────

  describe("cadastrarAnimal", function () {
    it("deve cadastrar um animal e retornar ID = 1 no primeiro cadastro", async function () {
      const tx = await vacPet
        .connect(tutor1)
        .cadastrarAnimal(
          ANIMAL_PADRAO.nome,
          ANIMAL_PADRAO.especie,
          ANIMAL_PADRAO.raca,
          ANIMAL_PADRAO.dataNascimento,
          ANIMAL_PADRAO.cor
        );

      const receipt = await tx.wait();
      // O retorno da função pode ser lido via simulação
      const id = await vacPet
        .connect(tutor1)
        .cadastrarAnimal.staticCall(
          "Mel",
          "Gato",
          "SRD",
          toTimestamp("2021-06-01"),
          "Cinza"
        );

      expect(id).to.equal(2); // segundo animal → ID 2
    });

    it("deve incrementar totalAnimais a cada cadastro", async function () {
      await vacPet
        .connect(tutor1)
        .cadastrarAnimal(...Object.values(ANIMAL_PADRAO));

      await vacPet
        .connect(tutor2)
        .cadastrarAnimal("Mel", "Gato", "SRD", toTimestamp("2021-06-01"), "Cinza");

      expect(await vacPet.totalAnimais()).to.equal(2);
    });

    it("deve emitir o evento AnimalCadastrado com os dados corretos", async function () {
      await expect(
        vacPet
          .connect(tutor1)
          .cadastrarAnimal(...Object.values(ANIMAL_PADRAO))
      )
        .to.emit(vacPet, "AnimalCadastrado")
        .withArgs(1, ANIMAL_PADRAO.nome, tutor1.address);
    });

    it("deve vincular o animal ao tutor que enviou a transação", async function () {
      await vacPet
        .connect(tutor1)
        .cadastrarAnimal(...Object.values(ANIMAL_PADRAO));

      const animal = await vacPet.consultarAnimal(1);
      expect(animal.tutor).to.equal(tutor1.address);
    });

    it("deve gravar todos os campos do animal corretamente", async function () {
      await vacPet
        .connect(tutor1)
        .cadastrarAnimal(...Object.values(ANIMAL_PADRAO));

      const animal = await vacPet.consultarAnimal(1);
      expect(animal.id).to.equal(1);
      expect(animal.nome).to.equal(ANIMAL_PADRAO.nome);
      expect(animal.especie).to.equal(ANIMAL_PADRAO.especie);
      expect(animal.raca).to.equal(ANIMAL_PADRAO.raca);
      expect(animal.dataNascimento).to.equal(ANIMAL_PADRAO.dataNascimento);
      expect(animal.cor).to.equal(ANIMAL_PADRAO.cor);
      expect(animal.ativo).to.be.true;
    });

    it("deve adicionar o ID do animal na lista animaisDoTutor", async function () {
      await vacPet
        .connect(tutor1)
        .cadastrarAnimal(...Object.values(ANIMAL_PADRAO));

      const ids = await vacPet.animaisDoTutor(tutor1.address);
      expect(ids.length).to.equal(1);
      expect(ids[0]).to.equal(1);
    });

    it("deve gerar IDs únicos e crescentes para múltiplos animais", async function () {
      await vacPet
        .connect(tutor1)
        .cadastrarAnimal(...Object.values(ANIMAL_PADRAO));

      await vacPet
        .connect(tutor1)
        .cadastrarAnimal("Mel", "Gato", "SRD", toTimestamp("2022-01-01"), "Preto");

      const ids = await vacPet.animaisDoTutor(tutor1.address);
      expect(ids[0]).to.equal(1);
      expect(ids[1]).to.equal(2);
    });

    it("deve permitir que tutores diferentes cadastrem animais simultaneamente", async function () {
      await vacPet.connect(tutor1).cadastrarAnimal(...Object.values(ANIMAL_PADRAO));
      await vacPet
        .connect(tutor2)
        .cadastrarAnimal("Mel", "Gato", "SRD", toTimestamp("2022-01-01"), "Preto");

      expect(await vacPet.totalAnimais()).to.equal(2);

      const idsTutor1 = await vacPet.animaisDoTutor(tutor1.address);
      const idsTutor2 = await vacPet.animaisDoTutor(tutor2.address);
      expect(idsTutor1.length).to.equal(1);
      expect(idsTutor2.length).to.equal(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // registrarVacina
  // ───────────────────────────────────────────────────────────────────────────

  describe("registrarVacina", function () {
    beforeEach(async function () {
      // Cadastra um animal para ser usado nos testes de vacina
      await vacPet.connect(tutor1).cadastrarAnimal(...Object.values(ANIMAL_PADRAO));
    });

    it("deve registrar uma vacina com sucesso", async function () {
      await vacPet.connect(tutor1).registrarVacina(
        1,
        ...Object.values(VACINA_PADRAO)
      );

      expect(await vacPet.totalVacinas(1)).to.equal(1);
    });

    it("deve gravar todos os campos da vacina corretamente", async function () {
      await vacPet.connect(tutor1).registrarVacina(1, ...Object.values(VACINA_PADRAO));

      const vacinas = await vacPet.consultarVacinas(1);
      const v = vacinas[0];
      expect(v.nome).to.equal(VACINA_PADRAO.nomeVacina);
      expect(v.lote).to.equal(VACINA_PADRAO.lote);
      expect(v.dataAplicacao).to.equal(VACINA_PADRAO.dataAplicacao);
      expect(v.proximaDose).to.equal(VACINA_PADRAO.proximaDose);
      expect(v.veterinario).to.equal(VACINA_PADRAO.veterinario);
      expect(v.clinica).to.equal(VACINA_PADRAO.clinica);
    });

    it("deve emitir o evento VacinaRegistrada com os dados corretos", async function () {
      await expect(
        vacPet.connect(tutor1).registrarVacina(1, ...Object.values(VACINA_PADRAO))
      )
        .to.emit(vacPet, "VacinaRegistrada")
        .withArgs(1, VACINA_PADRAO.nomeVacina, VACINA_PADRAO.dataAplicacao);
    });

    it("deve aceitar proximaDose = 0 (sem próxima dose prevista)", async function () {
      await vacPet
        .connect(tutor1)
        .registrarVacina(
          1,
          "Antirrábica",
          "LOTE-2024-002",
          toTimestamp("2024-02-01"),
          0, // sem próxima dose
          "Dra. Maria — CRMV 99999",
          "PetCare"
        );

      const vacinas = await vacPet.consultarVacinas(1);
      expect(vacinas[0].proximaDose).to.equal(0);
    });

    it("deve acumular múltiplas vacinas em ordem (append-only)", async function () {
      await vacPet.connect(tutor1).registrarVacina(1, ...Object.values(VACINA_PADRAO));
      await vacPet
        .connect(tutor1)
        .registrarVacina(
          1,
          "Antirrábica",
          "LOTE-2024-002",
          toTimestamp("2024-03-01"),
          0,
          "Dra. Ana — CRMV 54321",
          "AniMed"
        );

      expect(await vacPet.totalVacinas(1)).to.equal(2);

      const vacinas = await vacPet.consultarVacinas(1);
      expect(vacinas[0].nome).to.equal("V10");
      expect(vacinas[1].nome).to.equal("Antirrábica");
    });

    it("deve rejeitar se chamado por quem não é o tutor", async function () {
      await expect(
        vacPet
          .connect(terceiro)
          .registrarVacina(1, ...Object.values(VACINA_PADRAO))
      ).to.be.revertedWith("VacPet: apenas o tutor pode executar esta acao");
    });

    it("deve rejeitar para um animalId inexistente", async function () {
      await expect(
        vacPet
          .connect(tutor1)
          .registrarVacina(999, ...Object.values(VACINA_PADRAO))
      ).to.be.revertedWith("VacPet: animal nao encontrado ou inativo");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // transferirTutor
  // ───────────────────────────────────────────────────────────────────────────

  describe("transferirTutor", function () {
    beforeEach(async function () {
      await vacPet.connect(tutor1).cadastrarAnimal(...Object.values(ANIMAL_PADRAO));
    });

    it("deve transferir a tutoria para o novo tutor", async function () {
      await vacPet.connect(tutor1).transferirTutor(1, tutor2.address);
      const animal = await vacPet.consultarAnimal(1);
      expect(animal.tutor).to.equal(tutor2.address);
    });

    it("deve adicionar o animal na lista do novo tutor", async function () {
      await vacPet.connect(tutor1).transferirTutor(1, tutor2.address);
      const ids = await vacPet.animaisDoTutor(tutor2.address);
      expect(ids).to.include(1n);
    });

    it("deve preservar o ID do animal na lista do tutor antigo (rastreabilidade)", async function () {
      await vacPet.connect(tutor1).transferirTutor(1, tutor2.address);
      const idsAntigo = await vacPet.animaisDoTutor(tutor1.address);
      expect(idsAntigo).to.include(1n);
    });

    it("deve emitir o evento TutorTransferido com os endereços corretos", async function () {
      await expect(vacPet.connect(tutor1).transferirTutor(1, tutor2.address))
        .to.emit(vacPet, "TutorTransferido")
        .withArgs(1, tutor1.address, tutor2.address);
    });

    it("deve rejeitar transferência para address(0)", async function () {
      await expect(
        vacPet.connect(tutor1).transferirTutor(1, ethers.ZeroAddress)
      ).to.be.revertedWith("VacPet: endereco invalido");
    });

    it("deve rejeitar se chamado por quem não é o tutor atual", async function () {
      await expect(
        vacPet.connect(terceiro).transferirTutor(1, tutor2.address)
      ).to.be.revertedWith("VacPet: apenas o tutor pode executar esta acao");
    });

    it("deve rejeitar para animalId inexistente", async function () {
      await expect(
        vacPet.connect(tutor1).transferirTutor(999, tutor2.address)
      ).to.be.revertedWith("VacPet: animal nao encontrado ou inativo");
    });

    it("novo tutor deve poder registrar vacinas após a transferência", async function () {
      await vacPet.connect(tutor1).transferirTutor(1, tutor2.address);
      await expect(
        vacPet.connect(tutor2).registrarVacina(1, ...Object.values(VACINA_PADRAO))
      ).to.not.be.reverted;
    });

    it("tutor antigo não deve poder registrar vacinas após a transferência", async function () {
      await vacPet.connect(tutor1).transferirTutor(1, tutor2.address);
      await expect(
        vacPet.connect(tutor1).registrarVacina(1, ...Object.values(VACINA_PADRAO))
      ).to.be.revertedWith("VacPet: apenas o tutor pode executar esta acao");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // consultarAnimal
  // ───────────────────────────────────────────────────────────────────────────

  describe("consultarAnimal", function () {
    it("deve rejeitar consulta de ID inexistente (ID 0 nunca existe)", async function () {
      await expect(vacPet.consultarAnimal(0)).to.be.revertedWith(
        "VacPet: animal nao encontrado ou inativo"
      );
    });

    it("deve rejeitar consulta de ID fora do range cadastrado", async function () {
      await expect(vacPet.consultarAnimal(999)).to.be.revertedWith(
        "VacPet: animal nao encontrado ou inativo"
      );
    });

    it("deve permitir consulta pública (qualquer conta)", async function () {
      await vacPet.connect(tutor1).cadastrarAnimal(...Object.values(ANIMAL_PADRAO));
      const animal = await vacPet.connect(terceiro).consultarAnimal(1);
      expect(animal.nome).to.equal(ANIMAL_PADRAO.nome);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // consultarVacinas
  // ───────────────────────────────────────────────────────────────────────────

  describe("consultarVacinas", function () {
    it("deve retornar array vazio para animal sem vacinas", async function () {
      await vacPet.connect(tutor1).cadastrarAnimal(...Object.values(ANIMAL_PADRAO));
      const vacinas = await vacPet.consultarVacinas(1);
      expect(vacinas.length).to.equal(0);
    });

    it("deve rejeitar consulta de ID inexistente", async function () {
      await expect(vacPet.consultarVacinas(999)).to.be.revertedWith(
        "VacPet: animal nao encontrado ou inativo"
      );
    });

    it("deve permitir consulta pública por qualquer endereço", async function () {
      await vacPet.connect(tutor1).cadastrarAnimal(...Object.values(ANIMAL_PADRAO));
      await vacPet.connect(tutor1).registrarVacina(1, ...Object.values(VACINA_PADRAO));

      const vacinas = await vacPet.connect(terceiro).consultarVacinas(1);
      expect(vacinas.length).to.equal(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // totalVacinas
  // ───────────────────────────────────────────────────────────────────────────

  describe("totalVacinas", function () {
    it("deve retornar 0 para animal sem vacinas registradas", async function () {
      await vacPet.connect(tutor1).cadastrarAnimal(...Object.values(ANIMAL_PADRAO));
      expect(await vacPet.totalVacinas(1)).to.equal(0);
    });

    it("deve incrementar a cada vacina registrada", async function () {
      await vacPet.connect(tutor1).cadastrarAnimal(...Object.values(ANIMAL_PADRAO));

      await vacPet.connect(tutor1).registrarVacina(1, ...Object.values(VACINA_PADRAO));
      expect(await vacPet.totalVacinas(1)).to.equal(1);

      await vacPet
        .connect(tutor1)
        .registrarVacina(
          1,
          "Gripe",
          "LOTE-2024-003",
          toTimestamp("2024-04-01"),
          toTimestamp("2025-04-01"),
          "Dr. Carlos — CRMV 77777",
          "PetSaúde"
        );
      expect(await vacPet.totalVacinas(1)).to.equal(2);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // animaisDoTutor
  // ───────────────────────────────────────────────────────────────────────────

  describe("animaisDoTutor", function () {
    it("deve retornar array vazio para tutor sem animais", async function () {
      const ids = await vacPet.animaisDoTutor(terceiro.address);
      expect(ids.length).to.equal(0);
    });

    it("deve listar todos os animais de um tutor", async function () {
      await vacPet.connect(tutor1).cadastrarAnimal(...Object.values(ANIMAL_PADRAO));
      await vacPet
        .connect(tutor1)
        .cadastrarAnimal("Rex", "Cão", "Pastor Alemão", toTimestamp("2019-07-20"), "Preto");

      const ids = await vacPet.animaisDoTutor(tutor1.address);
      expect(ids.length).to.equal(2);
      expect(ids).to.include(1n);
      expect(ids).to.include(2n);
    });

    it("não deve misturar animais de tutores diferentes", async function () {
      await vacPet.connect(tutor1).cadastrarAnimal(...Object.values(ANIMAL_PADRAO));
      await vacPet
        .connect(tutor2)
        .cadastrarAnimal("Mel", "Gato", "SRD", toTimestamp("2022-01-01"), "Cinza");

      const idsTutor1 = await vacPet.animaisDoTutor(tutor1.address);
      const idsTutor2 = await vacPet.animaisDoTutor(tutor2.address);

      expect(idsTutor1).to.not.include(2n);
      expect(idsTutor2).to.not.include(1n);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // totalAnimais
  // ───────────────────────────────────────────────────────────────────────────

  describe("totalAnimais", function () {
    it("deve retornar 0 antes de qualquer cadastro", async function () {
      expect(await vacPet.totalAnimais()).to.equal(0);
    });

    it("deve refletir o total correto após N cadastros", async function () {
      for (let i = 0; i < 5; i++) {
        await vacPet
          .connect(tutor1)
          .cadastrarAnimal(`Pet ${i}`, "Cão", "SRD", toTimestamp("2020-01-01"), "Marrom");
      }
      expect(await vacPet.totalAnimais()).to.equal(5);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CENÁRIOS DE INTEGRAÇÃO (fluxos completos)
  // ───────────────────────────────────────────────────────────────────────────

  describe("Cenários de integração", function () {
    it("fluxo completo: cadastro → vacinação → consulta pública", async function () {
      // 1. Tutor1 cadastra um animal
      await vacPet.connect(tutor1).cadastrarAnimal(...Object.values(ANIMAL_PADRAO));

      // 2. Tutor1 registra duas vacinas
      await vacPet.connect(tutor1).registrarVacina(1, ...Object.values(VACINA_PADRAO));
      await vacPet
        .connect(tutor1)
        .registrarVacina(
          1,
          "Antirrábica",
          "LOTE-2024-002",
          toTimestamp("2024-02-15"),
          0,
          "Dra. Paula — CRMV 88888",
          "ClínicaVet"
        );

      // 3. Terceiro consulta publicamente
      const animal = await vacPet.connect(terceiro).consultarAnimal(1);
      const vacinasRegistradas = await vacPet.connect(terceiro).consultarVacinas(1);

      expect(animal.nome).to.equal("Thor");
      expect(vacinasRegistradas.length).to.equal(2);
      expect(await vacPet.totalVacinas(1)).to.equal(2);
    });

    it("fluxo completo: adoção com histórico preservado", async function () {
      // 1. Tutor1 cadastra animal e registra vacina
      await vacPet.connect(tutor1).cadastrarAnimal(...Object.values(ANIMAL_PADRAO));
      await vacPet.connect(tutor1).registrarVacina(1, ...Object.values(VACINA_PADRAO));

      // 2. Adoção: tutoria transferida para tutor2
      await vacPet.connect(tutor1).transferirTutor(1, tutor2.address);

      // 3. Novo tutor pode registrar vacinas
      await vacPet
        .connect(tutor2)
        .registrarVacina(
          1,
          "Gripe Canina",
          "LOTE-2024-005",
          toTimestamp("2024-06-01"),
          toTimestamp("2025-06-01"),
          "Dr. Pedro — CRMV 55555",
          "PetHosp"
        );

      // 4. Histórico completo preservado (ambas as vacinas)
      const vacinas = await vacPet.consultarVacinas(1);
      expect(vacinas.length).to.equal(2);
      expect(vacinas[0].nome).to.equal("V10");
      expect(vacinas[1].nome).to.equal("Gripe Canina");
    });

    it("fluxo completo: múltiplos animais, múltiplos tutores, múltiplas vacinas", async function () {
      // Tutor1 com 2 animais
      await vacPet.connect(tutor1).cadastrarAnimal(...Object.values(ANIMAL_PADRAO));
      await vacPet
        .connect(tutor1)
        .cadastrarAnimal("Rex", "Cão", "Pit Bull", toTimestamp("2018-11-05"), "Branco");

      // Tutor2 com 1 animal
      await vacPet
        .connect(tutor2)
        .cadastrarAnimal("Garfield", "Gato", "Persa", toTimestamp("2021-04-01"), "Laranja");

      // Vacinação
      await vacPet.connect(tutor1).registrarVacina(1, ...Object.values(VACINA_PADRAO));
      await vacPet.connect(tutor1).registrarVacina(2, ...Object.values(VACINA_PADRAO));
      await vacPet
        .connect(tutor2)
        .registrarVacina(
          3,
          "Tríplice Felina",
          "LOTE-CAT-001",
          toTimestamp("2024-03-10"),
          toTimestamp("2025-03-10"),
          "Dra. Laura — CRMV 11111",
          "GatoVet"
        );

      // Verificações
      expect(await vacPet.totalAnimais()).to.equal(3);
      expect(await vacPet.totalVacinas(1)).to.equal(1);
      expect(await vacPet.totalVacinas(2)).to.equal(1);
      expect(await vacPet.totalVacinas(3)).to.equal(1);

      const idsTutor1 = await vacPet.animaisDoTutor(tutor1.address);
      expect(idsTutor1.length).to.equal(2);
    });
  });
});