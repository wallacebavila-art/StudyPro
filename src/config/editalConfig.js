// Estrutura do Edital - Analista de Segurança da Informação

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
    descricao: 'Ética Profissional, sigilo profissional. Resolução Conjunta nº 3/2013. Lei nº 14.133/2021',
    topicos: [
      'Ética Profissional em TI',
      'Responsabilidade técnica',
      'Sigilo profissional',
      'Resolução Conjunta nº 3/2013',
      'Contratação de TI',
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

// Mapeamento de variações de tópicos para tópicos oficiais do edital
export const MAPEAMENTO_TOPICOS = {
  // Gestão de Riscos ISO 31000
  'iso 31000': 'Gestão de riscos (ISO 31000)',
  'iso31000': 'Gestão de riscos (ISO 31000)',
  'gestão de riscos': 'Gestão de riscos (ISO 31000)',
  'gestao de riscos': 'Gestão de riscos (ISO 31000)',
  'gerenciamento de riscos': 'Gestão de riscos (ISO 31000)',
  'risk management': 'Gestão de riscos (ISO 31000)',
  'framework de riscos': 'Gestão de riscos (ISO 31000)',
  'análise de riscos': 'Gestão de riscos (ISO 31000)',
  'avaliação de riscos': 'Gestão de riscos (ISO 31000)',
  
  // ISO 22301 - Continuidade
  'iso 22301': 'Continuidade do negócio (ISO 22301)',
  'iso22301': 'Continuidade do negócio (ISO 22301)',
  'continuidade de negócios': 'Continuidade do negócio (ISO 22301)',
  'continuidade do negocio': 'Continuidade do negócio (ISO 22301)',
  'business continuity': 'Continuidade do negócio (ISO 22301)',
  
  // ISO 9001
  'iso 9001': 'ISO 9001 em Segurança da Informação',
  'iso9001': 'ISO 9001 em Segurança da Informação',
  'iso 9001:2015': 'ISO 9001 em Segurança da Informação',
  'gestão da qualidade': 'ISO 9001 em Segurança da Informação',
  
  // ISO 27001
  'iso 27001': 'Segurança da Informação e Privacidade',
  'iso27001': 'Segurança da Informação e Privacidade',
  'iso/iec 27001': 'Segurança da Informação e Privacidade',
  'sgsi': 'Segurança da Informação e Privacidade',
  
  // LGPD
  'lgpd': 'LGPD (Lei Geral de Proteção de Dados)',
  'lei geral de proteção de dados': 'LGPD (Lei Geral de Proteção de Dados)',
  'lei 13.709': 'LGPD (Lei Geral de Proteção de Dados)',
  'proteção de dados': 'LGPD (Lei Geral de Proteção de Dados)',
  'privacidade de dados': 'LGPD (Lei Geral de Proteção de Dados)',
  
  // IAM
  'iam': 'Gestão de Identidades e Acesso (IAM)',
  'identity': 'Gestão de Identidades e Acesso (IAM)',
  'access management': 'Gestão de Identidades e Acesso (IAM)',
  'controle de acesso': 'Gestão de Identidades e Acesso (IAM)',
  
  // MFA
  'mfa': 'Autenticação multifatorial (MFA)',
  'autenticação multifator': 'Autenticação multifatorial (MFA)',
  'multi-factor': 'Autenticação multifatorial (MFA)',
  '2fa': 'Autenticação multifatorial (MFA)',
  'dois fatores': 'Autenticação multifatorial (MFA)',
  
  // SSO
  'sso': 'Single sign-on (SSO)',
  'single sign on': 'Single sign-on (SSO)',
  
  // RBAC
  'rbac': 'RBAC (Role-Based Access Control)',
  'role based': 'RBAC (Role-Based Access Control)',
  'controle baseado em função': 'RBAC (Role-Based Access Control)',
  
  // ABAC
  'abac': 'ABAC (Attribute-Based Access Control)',
  'attribute based': 'ABAC (Attribute-Based Access Control)',
  
  // PAM
  'pam': 'PAM (Privileged Access Management)',
  'privileged access': 'PAM (Privileged Access Management)',
  'acesso privilegiado': 'PAM (Privileged Access Management)',
  
  // Firewalls
  'firewall': 'Firewalls tradicionais',
  'firewalls': 'Firewalls tradicionais',
  'ngfw': 'NGFW (Next-Generation Firewall)',
  'next generation': 'NGFW (Next-Generation Firewall)',
  'next-generation': 'NGFW (Next-Generation Firewall)',
  
  // DMZ
  'dmz': 'DMZ (Demilitarized Zone)',
  'demilitarized': 'DMZ (Demilitarized Zone)',
  'zona desmilitarizada': 'DMZ (Demilitarized Zone)',
  
  // Proxy
  'proxy': 'Proxy',
  'proxies': 'Proxy',
  
  // NAT
  'nat': 'NAT (Network Address Translation)',
  'network address': 'NAT (Network Address Translation)',
  'traducao de enderecos': 'NAT (Network Address Translation)',
  
  // DevSecOps
  'owasp': 'OWASP Top 10',
  'owasp top 10': 'OWASP Top 10',
  'top 10': 'OWASP Top 10',
  'sast': 'SAST (Static Application Security Testing)',
  'static application': 'SAST (Static Application Security Testing)',
  'dast': 'DAST (Dynamic Application Security Testing)',
  'dynamic application': 'DAST (Dynamic Application Security Testing)',
  'sdlc': 'SDLC seguro (Secure Software Development Life Cycle)',
  'secure software': 'SDLC seguro (Secure Software Development Life Cycle)',
  
  // Redes e Incidentes
  'ddos': 'DoS e DDoS',
  'dos': 'DoS e DDoS',
  'denial of service': 'DoS e DDoS',
  'spoofing': 'Spoofing',
  'phishing': 'Phishing',
  'xss': 'XSS (Cross-Site Scripting)',
  'cross site': 'XSS (Cross-Site Scripting)',
  'csrf': 'CSRF (Cross-Site Request Forgery)',
  'cross site request': 'CSRF (Cross-Site Request Forgery)',
  'wireshark': 'Wireshark',
  'siem': 'SIEM (Security Information and Event Management)',
  'threat intelligence': 'Threat intelligence',
  'ioc': 'IOC (Indicators of Compromise)',
  'indicators of compromise': 'IOC (Indicators of Compromise)',
  'ttp': 'TTP (Tactics, Techniques, and Procedures)',
  'nist': 'Resposta a incidentes (NIST SP 800-61 Rev. 3)',
  'nist 800-61': 'Resposta a incidentes (NIST SP 800-61 Rev. 3)',
  
  // Criptografia
  'aes': 'Criptografia simétrica (AES)',
  'criptografia simetrica': 'Criptografia simétrica (AES)',
  'rsa': 'Criptografia assimétrica (RSA, ECC)',
  'ecc': 'Criptografia assimétrica (RSA, ECC)',
  'criptografia assimétrica': 'Criptografia assimétrica (RSA, ECC)',
  'pki': 'PKI (Public Key Infrastructure)',
  'public key': 'PKI (Public Key Infrastructure)',
  'certificado digital': 'Certificados digitais',
  'certificados': 'Certificados digitais',
  'ssl': 'SSL/TLS',
  'tls': 'SSL/TLS',
  'sha': 'Hashes (SHA, bcrypt, HMAC)',
  'bcrypt': 'Hashes (SHA, bcrypt, HMAC)',
  'hmac': 'Hashes (SHA, bcrypt, HMAC)',
  'hash': 'Hashes (SHA, bcrypt, HMAC)',
  
  // Monitoramento
  'prometheus': 'Prometheus',
  'grafana': 'Grafana',
  'elk': 'ELK Stack (Elasticsearch, Logstash, Kibana)',
  'elasticsearch': 'ELK Stack (Elasticsearch, Logstash, Kibana)',
  'logstash': 'ELK Stack (Elasticsearch, Logstash, Kibana)',
  'kibana': 'ELK Stack (Elasticsearch, Logstash, Kibana)',
  'zabbix': 'Zabbix',
  'nagios': 'Nagios',
  'logs': 'Análise de logs',
  'analise de logs': 'Análise de logs',
  'sniffer': 'Sniffers',
  'sniffers': 'Sniffers',
  
  // Continuidade
  'bia': 'BIA (Business Impact Analysis)',
  'business impact': 'BIA (Business Impact Analysis)',
  'drp': 'DRP (Disaster Recovery Plan)',
  'disaster recovery': 'DRP (Disaster Recovery Plan)',
  'backup': 'Backups seguros',
  'backups': 'Backups seguros',
  
  // Indicadores
  'okr': 'OKRs (Objectives and Key Results)',
  'objectives': 'OKRs (Objectives and Key Results)',
  'kpi': 'KPIs (Key Performance Indicators) em ambientes críticos',
  'key performance': 'KPIs (Key Performance Indicators) em ambientes críticos',
  'indicadores': 'KPIs (Key Performance Indicators) em ambientes críticos',
  
  // Redes
  'osi': 'Modelo OSI',
  'modelo osi': 'Modelo OSI',
  'tcp': 'TCP/IP',
  'tcp/ip': 'TCP/IP',
  'ip': 'TCP/IP',
  'mpls': 'MPLS (Multiprotocol Label Switching)',
  'multiprotocol': 'MPLS (Multiprotocol Label Switching)',
  'sdwan': 'SD-WAN',
  'sd-wan': 'SD-WAN',
  'vlan': 'VLANs (Virtual LANs)',
  'vlans': 'VLANs (Virtual LANs)',
  'virtual lan': 'VLANs (Virtual LANs)',
  'wpa2': 'Segurança de redes sem fio (WPA2, EAP)',
  'wpa': 'Segurança de redes sem fio (WPA2, EAP)',
  'eap': 'Segurança de redes sem fio (WPA2, EAP)',
  'wifi': 'Segurança de redes sem fio (WPA2, EAP)',
  'wireless': 'Segurança de redes sem fio (WPA2, EAP)',
  
  // Laudos
  'laudo': 'Estrutura de laudos técnicos',
  'laudos': 'Estrutura de laudos técnicos',
  'parecer': 'Pareceres técnicos',
  'pareceres': 'Pareceres técnicos',
  
  // Legislação
  'ética': 'Ética Profissional em TI',
  'etica': 'Ética Profissional em TI',
  'responsabilidade': 'Responsabilidade técnica',
  'sigilo': 'Sigilo profissional',
  'resolucao 3/2013': 'Resolução Conjunta nº 3/2013',
  'cnj': 'Resolução Conjunta nº 3/2013',
  'contratacao ti': 'Contratação de TI',
  'contratação de ti': 'Contratação de TI',
  'lei 14.133': 'Lei nº 14.133/2021 (Lei de Licitações e Contratos)',
  'licitações': 'Lei nº 14.133/2021 (Lei de Licitações e Contratos)',
  'contrato': 'Lei nº 14.133/2021 (Lei de Licitações e Contratos)'
};

// Função para normalizar um tópico para o formato oficial do edital
export function normalizarTopico(topico) {
  if (!topico || typeof topico !== 'string') return '';
  
  const topicoLower = topico.toLowerCase().trim();
  
  // Verifica se há mapeamento direto
  for (const [chave, valor] of Object.entries(MAPEAMENTO_TOPICOS)) {
    if (topicoLower.includes(chave.toLowerCase())) {
      return valor;
    }
  }
  
  // Se não encontrou mapeamento, retorna o tópico original limpo
  // mas truncado para não ficar muito longo
  return topico.trim();
}

// Função para gerar o texto do prompt do Gemini
export function gerarPromptEdital() {
  let prompt = `EDITAL - ANALISTA DE SEGURANÇA DA INFORMAÇÃO

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
    'resolucao': 'Legislação e Aspectos Éticos',
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

// Função para normalizar disciplina para o formato oficial do edital
export function normalizarDisciplina(disciplina) {
  if (!disciplina || typeof disciplina !== 'string') return '';
  
  const discLower = disciplina.toLowerCase().trim();
  
  // Verifica se é exatamente uma disciplina do edital
  for (const disc of DISCIPLINAS) {
    if (discLower === disc.toLowerCase()) {
      return disc;
    }
  }
  
  // Mapeamento de variações para disciplinas oficiais
  const mapeamentos = {
    // Segurança da Informação
    'seguranca da informacao': 'Segurança da Informação e Privacidade',
    'segurança da informação': 'Segurança da Informação e Privacidade',
    'seguranca': 'Segurança da Informação e Privacidade',
    'segurança': 'Segurança da Informação e Privacidade',
    'privacidade': 'Segurança da Informação e Privacidade',
    'proteção de dados': 'Segurança da Informação e Privacidade',
    'lgpd': 'Segurança da Informação e Privacidade',
    'iso 27001': 'Segurança da Informação e Privacidade',
    'iso 31000': 'Segurança da Informação e Privacidade',
    'iso 22301': 'Segurança da Informação e Privacidade',
    'continuidade': 'Segurança da Informação e Privacidade',
    'gestão de riscos': 'Segurança da Informação e Privacidade',
    
    // IAM
    'iam': 'Gestão de Identidades e Acesso (IAM)',
    'identidade': 'Gestão de Identidades e Acesso (IAM)',
    'identidades': 'Gestão de Identidades e Acesso (IAM)',
    'acesso': 'Gestão de Identidades e Acesso (IAM)',
    'mfa': 'Gestão de Identidades e Acesso (IAM)',
    'sso': 'Gestão de Identidades e Acesso (IAM)',
    'rbac': 'Gestão de Identidades e Acesso (IAM)',
    'abac': 'Gestão de Identidades e Acesso (IAM)',
    'pam': 'Gestão de Identidades e Acesso (IAM)',
    'autenticação': 'Gestão de Identidades e Acesso (IAM)',
    'controle de acesso': 'Gestão de Identidades e Acesso (IAM)',
    
    // Firewalls
    'firewall': 'Firewalls e Proteção Perimetral',
    'firewalls': 'Firewalls e Proteção Perimetral',
    'perimetral': 'Firewalls e Proteção Perimetral',
    'dmz': 'Firewalls e Proteção Perimetral',
    'proxy': 'Firewalls e Proteção Perimetral',
    'nat': 'Firewalls e Proteção Perimetral',
    'ngfw': 'Firewalls e Proteção Perimetral',
    'perímetro': 'Firewalls e Proteção Perimetral',
    
    // DevSecOps
    'devsecops': 'Desenvolvimento Seguro (DevSecOps)',
    'desenvolvimento': 'Desenvolvimento Seguro (DevSecOps)',
    'desenvolvimento seguro': 'Desenvolvimento Seguro (DevSecOps)',
    'owasp': 'Desenvolvimento Seguro (DevSecOps)',
    'sast': 'Desenvolvimento Seguro (DevSecOps)',
    'dast': 'Desenvolvimento Seguro (DevSecOps)',
    'sdlc': 'Desenvolvimento Seguro (DevSecOps)',
    'codificação': 'Desenvolvimento Seguro (DevSecOps)',
    
    // Redes e Incidentes
    'redes': 'Segurança em Redes e Resposta a Incidentes',
    'incidentes': 'Segurança em Redes e Resposta a Incidentes',
    'resposta a incidentes': 'Segurança em Redes e Resposta a Incidentes',
    'ddos': 'Segurança em Redes e Resposta a Incidentes',
    'spoofing': 'Segurança em Redes e Resposta a Incidentes',
    'phishing': 'Segurança em Redes e Resposta a Incidentes',
    'xss': 'Segurança em Redes e Resposta a Incidentes',
    'csrf': 'Segurança em Redes e Resposta a Incidentes',
    'wireshark': 'Segurança em Redes e Resposta a Incidentes',
    'siem': 'Segurança em Redes e Resposta a Incidentes',
    'threat': 'Segurança em Redes e Resposta a Incidentes',
    'nist': 'Segurança em Redes e Resposta a Incidentes',
    
    // Criptografia
    'criptografia': 'Criptografia e Certificação Digital',
    'certificação': 'Criptografia e Certificação Digital',
    'pki': 'Criptografia e Certificação Digital',
    'ssl': 'Criptografia e Certificação Digital',
    'tls': 'Criptografia e Certificação Digital',
    'aes': 'Criptografia e Certificação Digital',
    'rsa': 'Criptografia e Certificação Digital',
    'hash': 'Criptografia e Certificação Digital',
    
    // Monitoramento
    'monitoramento': 'Monitoramento e Observabilidade',
    'observabilidade': 'Monitoramento e Observabilidade',
    'prometheus': 'Monitoramento e Observabilidade',
    'grafana': 'Monitoramento e Observabilidade',
    'elk': 'Monitoramento e Observabilidade',
    'zabbix': 'Monitoramento e Observabilidade',
    'nagios': 'Monitoramento e Observabilidade',
    'log': 'Monitoramento e Observabilidade',
    'sniffer': 'Monitoramento e Observabilidade',
    
    // Continuidade
    'continuidade de negócios': 'Plano de Continuidade e Recuperação de Desastres',
    'continuidade do negocio': 'Plano de Continuidade e Recuperação de Desastres',
    'recuperação': 'Plano de Continuidade e Recuperação de Desastres',
    'desastres': 'Plano de Continuidade e Recuperação de Desastres',
    'drp': 'Plano de Continuidade e Recuperação de Desastres',
    'bia': 'Plano de Continuidade e Recuperação de Desastres',
    'backup': 'Plano de Continuidade e Recuperação de Desastres',
    
    // Gestão da Qualidade
    'qualidade': 'Gestão da Qualidade e Indicadores de Performance',
    'iso 9001': 'Gestão da Qualidade e Indicadores de Performance',
    'okr': 'Gestão da Qualidade e Indicadores de Performance',
    'kpi': 'Gestão da Qualidade e Indicadores de Performance',
    'indicadores': 'Gestão da Qualidade e Indicadores de Performance',
    
    // Redes de Computadores
    'redes de computadores': 'Redes de Computadores',
    'tcp/ip': 'Redes de Computadores',
    'osi': 'Redes de Computadores',
    'mpls': 'Redes de Computadores',
    'sdwan': 'Redes de Computadores',
    'vlan': 'Redes de Computadores',
    'wpa2': 'Redes de Computadores',
    
    // Laudos
    'laudos': 'Laudos e Documentação Técnica',
    'documentação': 'Laudos e Documentação Técnica',
    'parecer': 'Laudos e Documentação Técnica',
    
    // Legislação
    'legislação': 'Legislação e Aspectos Éticos',
    'legislacao': 'Legislação e Aspectos Éticos',
    'ética': 'Legislação e Aspectos Éticos',
    'etica': 'Legislação e Aspectos Éticos',
    'resolucao': 'Legislação e Aspectos Éticos',
    'lei 14.133': 'Legislação e Aspectos Éticos',
    'contrato': 'Legislação e Aspectos Éticos'
  };
  
  // Verifica mapeamento
  for (const [chave, valor] of Object.entries(mapeamentos)) {
    if (discLower.includes(chave.toLowerCase())) {
      return valor;
    }
  }
  
  // Se não encontrou, retorna o valor original
  return disciplina.trim();
}

export default EDITAL_ESTRUTURA;
