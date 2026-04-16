// Estrutura do Edital - Analista de Segurança da Informação
// CNMP/2025

export const EDITAL_ESTRUTURA = {
  'Segurança da Informação e Privacidade': {
    descricao: 'Conceitos gerais, LGPD, gestão de riscos (ISO 31000), classificação da informação, políticas de segurança, segurança física e lógica, segurança em cloud, e continuidade do negócio (ISO 22301)',
    topicos: [
      'Conceitos gerais de Segurança da Informação',
      'LGPD (Lei Geral de Proteção de Dados)',
      'Gestão de riscos (ISO 31000)',
      'Classificação da informação',
      'Políticas de segurança',
      'Segurança física e lógica',
      'Segurança em cloud',
      'Continuidade do negócio (ISO 22301)'
    ]
  },
  'Gestão de Identidades e Acesso (IAM)': {
    descricao: 'Autenticação multifatorial (MFA), single sign-on (SSO), controle de acessos com RBAC, ABAC e PAM',
    topicos: [
      'Autenticação multifatorial (MFA)',
      'Single sign-on (SSO)',
      'RBAC (Role-Based Access Control)',
      'ABAC (Attribute-Based Access Control)',
      'PAM (Privileged Access Management)'
    ]
  },
  'Firewalls e Proteção Perimetral': {
    descricao: 'Configuração e operação de firewalls tradicionais e NGFW, zonas de segurança, DMZs, Proxy, NAT, técnicas de filtragem de tráfego e controle de aplicações',
    topicos: [
      'Firewalls tradicionais',
      'NGFW (Next-Generation Firewall)',
      'Zonas de segurança',
      'DMZ (Demilitarized Zone)',
      'Proxy',
      'NAT (Network Address Translation)',
      'Filtragem de tráfego',
      'Controle de aplicações'
    ]
  },
  'Desenvolvimento Seguro (DevSecOps)': {
    descricao: 'OWASP Top 10, testes de segurança (SAST, DAST), SDLC seguro, práticas de codificação segura',
    topicos: [
      'OWASP Top 10',
      'SAST (Static Application Security Testing)',
      'DAST (Dynamic Application Security Testing)',
      'SDLC seguro (Secure Software Development Life Cycle)',
      'Práticas de codificação segura',
      'Ferramentas: Veracode, SonarQube, Checkmarx'
    ]
  },
  'Segurança em Redes e Resposta a Incidentes': {
    descricao: 'Prevenção e mitigação de DoS, DDoS, spoofing, phishing, XSS, CSRF; Wireshark, gestão de vulnerabilidades, threat intelligence, IOC, TTP, e resposta a incidentes (NIST SP 800-61 Rev. 3)',
    topicos: [
      'DoS e DDoS',
      'Spoofing',
      'Phishing',
      'XSS (Cross-Site Scripting)',
      'CSRF (Cross-Site Request Forgery)',
      'Wireshark',
      'Gestão de vulnerabilidades',
      'Threat intelligence',
      'IOC (Indicators of Compromise)',
      'TTP (Tactics, Techniques, and Procedures)',
      'Resposta a incidentes (NIST SP 800-61 Rev. 3)'
    ]
  },
  'Criptografia e Certificação Digital': {
    descricao: 'Criptografia simétrica (AES) e assimétrica (RSA, ECC), PKI, certificados digitais, SSL/TLS, hashes (SHA, bcrypt, HMAC)',
    topicos: [
      'Criptografia simétrica (AES)',
      'Criptografia assimétrica (RSA, ECC)',
      'PKI (Public Key Infrastructure)',
      'Certificados digitais',
      'SSL/TLS',
      'Hashes (SHA, bcrypt, HMAC)'
    ]
  },
  'Monitoramento e Observabilidade': {
    descricao: 'Prometheus, Grafana, ELK, Zabbix e Nagios; SIEM; análise de logs, rastreamento de incidentes e sniffers',
    topicos: [
      'Prometheus',
      'Grafana',
      'ELK Stack (Elasticsearch, Logstash, Kibana)',
      'Zabbix',
      'Nagios',
      'SIEM (Security Information and Event Management)',
      'Análise de logs',
      'Rastreamento de incidentes',
      'Sniffers'
    ]
  },
  'Plano de Continuidade e Recuperação de Desastres': {
    descricao: 'Elaboração de BIA, DRP, backups seguros, testes de contingência, análise de impacto e estratégias de recuperação',
    topicos: [
      'BIA (Business Impact Analysis)',
      'DRP (Disaster Recovery Plan)',
      'Backups seguros',
      'Testes de contingência',
      'Análise de impacto',
      'Estratégias de recuperação de serviços essenciais'
    ]
  },
  'Gestão da Qualidade e Indicadores de Performance': {
    descricao: 'Aplicações da ISO 9001 à área de segurança da informação, definição e acompanhamento de OKRs e KPIs',
    topicos: [
      'ISO 9001 em Segurança da Informação',
      'OKRs (Objectives and Key Results)',
      'KPIs (Key Performance Indicators) em ambientes críticos'
    ]
  },
  'Redes de Computadores': {
    descricao: 'Modelo OSI, TCP/IP, MPLS, SDWAN, segmentação com VLANs, topologias de redes, protocolos de comunicação, segurança de redes sem fio',
    topicos: [
      'Modelo OSI',
      'TCP/IP',
      'MPLS (Multiprotocol Label Switching)',
      'SD-WAN',
      'VLANs (Virtual LANs)',
      'Topologias de redes',
      'Protocolos de comunicação',
      'Segurança de redes sem fio (WPA2, EAP)'
    ]
  },
  'Laudos e Documentação Técnica': {
    descricao: 'Elaboração de Documentos Técnicos: estrutura de laudos e pareceres técnicos',
    topicos: [
      'Estrutura de laudos técnicos',
      'Pareceres técnicos',
      'Documentação técnica em segurança da informação'
    ]
  },
  'Legislação e Aspectos Éticos': {
    descricao: 'Ética Profissional, sigilo profissional. Resolução Conjunta CNJ/CNMP nº 3/2013. Resolução CNMP nº 283/2024. Lei nº 14.133/2021',
    topicos: [
      'Ética Profissional em TI',
      'Responsabilidade técnica',
      'Sigilo profissional',
      'Resolução Conjunta CNJ/CNMP nº 3/2013',
      'Resolução CNMP nº 283/2024 (Contratação de TI)',
      'Lei nº 14.133/2021 (Lei de Licitações e Contratos)'
    ]
  }
};

// Lista plana de disciplinas para selects
export const DISCIPLINAS = Object.keys(EDITAL_ESTRUTURA);

// Função para obter tópicos de uma disciplina
export function getTopicos(disciplina) {
  return EDITAL_ESTRUTURA[disciplina]?.topicos || [];
}

// Função para gerar o texto do prompt do Gemini
export function gerarPromptEdital() {
  let prompt = `EDITAL - ANALISTA DE SEGURANÇA DA INFORMAÇÃO CNMP/2025

DISCIPLINAS E TÓPICOS (use EXATAMENTE estes nomes):

`;

  Object.entries(EDITAL_ESTRUTURA).forEach(([disciplina, dados], index) => {
    prompt += `${index + 1}. ${disciplina}\n`;
    dados.topicos.forEach((topico, tIndex) => {
      prompt += `   - ${topico}\n`;
    });
    prompt += '\n';
  });

  return prompt;
}

// Função para encontrar a disciplina mais próxima de um texto
export function encontrarDisciplinaProxima(texto) {
  const textoLower = texto.toLowerCase();
  
  for (const disciplina of DISCIPLINAS) {
    if (textoLower.includes(disciplina.toLowerCase())) {
      return disciplina;
    }
  }
  
  // Mapeamento de termos comuns
  const mapeamentos = {
    'lgpd': 'Segurança da Informação e Privacidade',
    'privacidade': 'Segurança da Informação e Privacidade',
    'iso 31000': 'Segurança da Informação e Privacidade',
    'iso 22301': 'Segurança da Informação e Privacidade',
    'iso 9001': 'Gestão da Qualidade e Indicadores de Performance',
    'iso 27001': 'Segurança da Informação e Privacidade',
    'iam': 'Gestão de Identidades e Acesso (IAM)',
    'mfa': 'Gestão de Identidades e Acesso (IAM)',
    'sso': 'Gestão de Identidades e Acesso (IAM)',
    'rbac': 'Gestão de Identidades e Acesso (IAM)',
    'abac': 'Gestão de Identidades e Acesso (IAM)',
    'pam': 'Gestão de Identidades e Acesso (IAM)',
    'firewall': 'Firewalls e Proteção Perimetral',
    'dmz': 'Firewalls e Proteção Perimetral',
    'proxy': 'Firewalls e Proteção Perimetral',
    'nat': 'Firewalls e Proteção Perimetral',
    'ngfw': 'Firewalls e Proteção Perimetral',
    'owasp': 'Desenvolvimento Seguro (DevSecOps)',
    'devsecops': 'Desenvolvimento Seguro (DevSecOps)',
    'sast': 'Desenvolvimento Seguro (DevSecOps)',
    'dast': 'Desenvolvimento Seguro (DevSecOps)',
    'codificação segura': 'Desenvolvimento Seguro (DevSecOps)',
    'ddos': 'Segurança em Redes e Resposta a Incidentes',
    'spoofing': 'Segurança em Redes e Resposta a Incidentes',
    'phishing': 'Segurança em Redes e Resposta a Incidentes',
    'xss': 'Segurança em Redes e Resposta a Incidentes',
    'csrf': 'Segurança em Redes e Resposta a Incidentes',
    'wireshark': 'Segurança em Redes e Resposta a Incidentes',
    'siem': 'Segurança em Redes e Resposta a Incidentes',
    'threat intelligence': 'Segurança em Redes e Resposta a Incidentes',
    'ioc': 'Segurança em Redes e Resposta a Incidentes',
    'ttp': 'Segurança em Redes e Resposta a Incidentes',
    'nist 800-61': 'Segurança em Redes e Resposta a Incidentes',
    'criptografia': 'Criptografia e Certificação Digital',
    'aes': 'Criptografia e Certificação Digital',
    'rsa': 'Criptografia e Certificação Digital',
    'ecc': 'Criptografia e Certificação Digital',
    'pki': 'Criptografia e Certificação Digital',
    'ssl': 'Criptografia e Certificação Digital',
    'tls': 'Criptografia e Certificação Digital',
    'sha': 'Criptografia e Certificação Digital',
    'certificado digital': 'Criptografia e Certificação Digital',
    'prometheus': 'Monitoramento e Observabilidade',
    'grafana': 'Monitoramento e Observabilidade',
    'elk': 'Monitoramento e Observabilidade',
    'zabbix': 'Monitoramento e Observabilidade',
    'nagios': 'Monitoramento e Observabilidade',
    'log': 'Monitoramento e Observabilidade',
    'sniffer': 'Monitoramento e Observabilidade',
    'bia': 'Plano de Continuidade e Recuperação de Desastres',
    'drp': 'Plano de Continuidade e Recuperação de Desastres',
    'backup': 'Plano de Continuidade e Recuperação de Desastres',
    'contingência': 'Plano de Continuidade e Recuperação de Desastres',
    'recuperação de desastres': 'Plano de Continuidade e Recuperação de Desastres',
    'okr': 'Gestão da Qualidade e Indicadores de Performance',
    'kpi': 'Gestão da Qualidade e Indicadores de Performance',
    'osi': 'Redes de Computadores',
    'tcp/ip': 'Redes de Computadores',
    'mpls': 'Redes de Computadores',
    'sdwan': 'Redes de Computadores',
    'vlan': 'Redes de Computadores',
    'topologia': 'Redes de Computadores',
    'protocolo': 'Redes de Computadores',
    'wpa2': 'Redes de Computadores',
    'eap': 'Redes de Computadores',
    'laudo': 'Laudos e Documentação Técnica',
    'parecer técnico': 'Laudos e Documentação Técnica',
    'documentação': 'Laudos e Documentação Técnica',
    'ética': 'Legislação e Aspectos Éticos',
    'sigilo': 'Legislação e Aspectos Éticos',
    'resolução cnmp': 'Legislação e Aspectos Éticos',
    'resolução cnj': 'Legislação e Aspectos Éticos',
    'lei 14.133': 'Legislação e Aspectos Éticos',
    'licitação': 'Legislação e Aspectos Éticos',
    'contrato administrativo': 'Legislação e Aspectos Éticos'
  };
  
  for (const [termo, disciplina] of Object.entries(mapeamentos)) {
    if (textoLower.includes(termo)) {
      return disciplina;
    }
  }
  
  return null;
}

export default EDITAL_ESTRUTURA;
