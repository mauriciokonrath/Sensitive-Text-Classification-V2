// Seleção de elementos
const dropArea = document.querySelector(".drag-area"),
    dragText = dropArea.querySelector("header"),
    button = document.querySelector("button"),
    input = dropArea.querySelector("input"),
    icon = dropArea.querySelector(".icon"),
    sensitive = document.querySelector(".sensitive"),
    nonsensitive = document.querySelector(".non-sensitive"),
    progressStatus = document.querySelector("#progressStatus"),
    progressBar = document.querySelector("#progressBar");

const toggle = document.querySelector(".toggle-button");
const navlinks = document.querySelector(".navbar-links");

let text_model = null;

// Navbar toggle button
toggle.addEventListener("click", () => {
    navlinks.classList.toggle("active");
});

button.onclick = () => {
    input.click();
};

input.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (file) {
        const fileType = file.type;
        const validExtensions = ["application/pdf"]; // Somente arquivos PDF permitidos
        if (validExtensions.includes(fileType)) {
            dropArea.classList.add("active");
            sensitive.style.display = "none";
            nonsensitive.style.display = "none";
            progressStatus.style.display = "block";
            progressBar.style.display = "block";
            progressBar.style.width = "0%";
            progressBar.innerHTML = "0%";
            dragText.style.display = "none";
            icon.style.display = "none";
            
            try {
                const text = await extractTextFromPDF(file);
                console.log("Texto extraído:", text); // Debug
                classifyText(text);
            } catch (error) {
                console.error("Erro ao extrair texto do PDF:", error);
            }
        } else {
            alert("Por favor, envie um arquivo PDF!");
            dropArea.classList.remove("active");
            dragText.style.display = "block";
            icon.style.display = "block";
        }
    }
});

// Função para extrair texto de um PDF
const extractTextFromPDF = async (file) => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = async (e) => {
            try {
                const typedarray = new Uint8Array(e.target.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let pdfText = [];

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item) => item.str).join(" ");
                    pdfText.push(pageText);

                    // Atualiza a barra de progresso conforme lê as páginas
                    let progress = Math.round((i / pdf.numPages) * 50);
                    progressBar.style.width = progress + "%";
                    progressBar.innerHTML = progress + "%";
                }

                resolve(pdfText.join(" "));
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

// Função para classificar texto
const classifyText = async (text) => {
    if (!text_model) {
        console.error("Modelo não carregado!");
        return;
    }

    progressStatus.style.display = "block";
    progressBar.style.display = "block";

    const max_length = 60;
    const tokens = text.split(" ").slice(0, max_length);
    console.log("Tokens gerados:", tokens);

    let word_index;
    try {
        word_index = await fetch("./models/text_model/word_index.json").then((response) => response.json());
    } catch (error) {
        console.error("Erro ao carregar word_index.json:", error);
        return;
    }

    let padded = new Array(max_length).fill(0);
    for (let i = 0; i < tokens.length; i++) {
        let tokenid = word_index[tokens[i]?.toLowerCase()];
        padded[i] = tokenid === undefined ? 1 : tokenid;
    }

    console.log("Entrada para o modelo:", padded);

    let tensor = tf.tensor([padded]);
    let classification;
    
    try {
        classification = await text_model.predict(tensor).data();
    } catch (error) {
        console.error("Erro ao fazer previsão:", error);
        return;
    }

    console.log("Resultado da classificação:", classification);

    // Atualiza barra de progresso até 100%
    for (let i = 50; i <= 100; i += 10) {
        progressBar.style.width = i + "%";
        progressBar.innerHTML = i + "%";
        await new Promise((r) => setTimeout(r, 50));
    }

    progressStatus.style.display = "none";
    progressBar.style.display = "none";

    // Exibe resultado
    if (classification[0] > 0.5) {
        sensitive.style.display = "block";
        console.log("Documento Classificado como Sensível");
    } else {
        nonsensitive.style.display = "block";
        console.log("Documento Classificado como Não Sensível");
    }
};

// Configuração inicial
const setupPage = async () => {
    try {
        text_model = await tf.loadLayersModel("./models/text_model/model.json");
        console.log("Modelo carregado com sucesso!");
        console.log(text_model.summary());
    } catch (error) {
        console.error("Erro ao carregar o modelo:", error);
    }
};

setupPage();
