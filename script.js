(function() {
    let mode = 'text'; // 初期モードはテキスト入力モード
  
    document.getElementById('text-mode').addEventListener('click', () => {
      mode = 'text';
      updateInputFields();
    });
  
    document.getElementById('drag-mode').addEventListener('click', () => {
      mode = 'drag';
      updateInputFields();
    });
  
    document.getElementById('matching-form').addEventListener('submit', function(event) {
      event.preventDefault();
      document.getElementById('loading').style.display = 'block';
      document.getElementById('error-message').innerText = ''; // エラーメッセージをクリア
  
      setTimeout(() => {
        const numApplicants = parseInt(document.getElementById('num-applicants').value, 10);
        const numEmployers = parseInt(document.getElementById('num-employers').value, 10);
        const proposer = document.querySelector('input[name="proposer"]:checked').value;
  
        const applicants = getApplicantData(numApplicants);
        const employers = getEmployerData(numEmployers);
  
        if (!validatePreferences(applicants, numEmployers) || !validatePreferences(employers, numApplicants)) {
          document.getElementById('error-message').innerText = '希望順位に誤りがあります。';
          document.getElementById('loading').style.display = 'none';
          return;
        }
  
        const matches = stableMatching(applicants, employers, proposer);
        document.getElementById('results').innerText = JSON.stringify(matches, null, 2);
        document.getElementById('loading').style.display = 'none';
      }, 1000); // シミュレーションのための遅延
    });
  
    document.getElementById('reset-button').addEventListener('click', () => {
      document.getElementById('matching-form').reset();
      document.getElementById('input-section').innerHTML = '';
      document.getElementById('results').innerText = '';
      document.getElementById('error-message').innerText = '';
    });
  
    document.getElementById('num-applicants').addEventListener('change', updateInputFields);
    document.getElementById('num-employers').addEventListener('change', updateInputFields);
  
    function updateInputFields() {
      const numApplicants = parseInt(document.getElementById('num-applicants').value, 10) || 0;
      const numEmployers = parseInt(document.getElementById('num-employers').value, 10) || 0;
      const inputSection = document.getElementById('input-section');
  
      inputSection.innerHTML = ''; // フィールドをリセット
  
      for (let i = 0; i < numApplicants; i++) {
        inputSection.innerHTML += `
          <div>
            <label for="applicant-name-${i}">応募者 ${i + 1} の名前:</label>
            <input type="text" id="applicant-name-${i}" name="applicant-name-${i}" required>
            <label for="applicant-preferences-${i}">希望順位:</label>
            ${mode === 'text' ? `<input type="text" id="applicant-preferences-${i}" name="applicant-preferences-${i}" required>` : `<ul id="applicant-preferences-${i}" class="sortable-list"></ul>`}
          </div>
        `;
      }
  
      for (let i = 0; i < numEmployers; i++) {
        inputSection.innerHTML += `
          <div>
            <label for="employer-name-${i}">配属先 ${i + 1} の名前:</label>
            <input type="text" id="employer-name-${i}" name="employer-name-${i}" required>
            <label for="employer-preferences-${i}">希望順位:</label>
            ${mode === 'text' ? `<input type="text" id="employer-preferences-${i}" name="employer-preferences-${i}" required>` : `<ul id="employer-preferences-${i}" class="sortable-list"></ul>`}
          </div>
        `;
      }
  
      if (mode === 'drag') {
        populatePreferences(numApplicants, numEmployers);
      }
    }
  
    function getApplicantData(numApplicants) {
      const applicants = [];
      for (let i = 0; i < numApplicants; i++) {
        const name = document.getElementById(`applicant-name-${i}`).value;
        let preferences;
        if (mode === 'text') {
          preferences = document.getElementById(`applicant-preferences-${i}`).value.split(',').map(pref => pref.trim());
        } else {
          preferences = Array.from(document.querySelectorAll(`#applicant-preferences-${i} li`)).map(li => li.innerText);
        }
        applicants.push({ name, preferences });
      }
      return applicants;
    }
  
    function getEmployerData(numEmployers) {
      const employers = [];
      for (let i = 0; i < numEmployers; i++) {
        const name = document.getElementById(`employer-name-${i}`).value;
        let preferences;
        if (mode === 'text') {
          preferences = document.getElementById(`employer-preferences-${i}`).value.split(',').map(pref => pref.trim());
        } else {
          preferences = Array.from(document.querySelectorAll(`#employer-preferences-${i} li`)).map(li => li.innerText);
        }
        employers.push({ name, preferences });
      }
      return employers;
    }
  
    function validatePreferences(list, numOptions) {
      return list.every(item => {
        const preferences = item.preferences;
        return preferences.length === numOptions && preferences.every((preference, index, self) => self.indexOf(preference) === index);
      });
    }
  
    function populatePreferences(numApplicants, numEmployers) {
      const applicantNameInputs = Array.from(document.querySelectorAll('[id^="applicant-name-"]'));
      const employerNameInputs = Array.from(document.querySelectorAll('[id^="employer-name-"]'));
  
      applicantNameInputs.forEach((input, i) => {
        const applicantPreferences = document.getElementById(`applicant-preferences-${i}`);
        applicantPreferences.innerHTML = '';
        employerNameInputs.forEach(employerInput => {
          const li = document.createElement('li');
          li.textContent = employerInput.value || `配属先 ${employerInput.id.split('-').pop()}`;
          applicantPreferences.appendChild(li);
        });
        new Sortable(applicantPreferences, {
          animation: 150
        });
      });
  
      employerNameInputs.forEach((input, i) => {
        const employerPreferences = document.getElementById(`employer-preferences-${i}`);
        employerPreferences.innerHTML = '';
        applicantNameInputs.forEach(applicantInput => {
          const li = document.createElement('li');
          li.textContent = applicantInput.value || `応募者 ${applicantInput.id.split('-').pop()}`;
          employerPreferences.appendChild(li);
        });
        new Sortable(employerPreferences, {
          animation: 150
        });
      });
    }
  
    function stableMatching(applicants, employers, proposer) {
      const matches = {};
      const freeProposers = [];
  
      if (proposer === 'applicants') {
        freeProposers.push(...applicants.map((applicant, index) => ({ ...applicant, index, nextProposalIndex: 0 })));
      } else {
        freeProposers.push(...employers.map((employer, index) => ({ ...employer, index, nextProposalIndex: 0 })));
      }
  
      while (freeProposers.length > 0) {
        const proposer = freeProposers.shift();
        const preferenceList = proposer.preferences;
        const nextChoiceIndex = proposer.nextProposalIndex;
  
        if (nextChoiceIndex >= preferenceList.length) {
          continue; // すべての提案を行い終えた場合は次の提案者へ
        }
  
        const nextChoice = preferenceList[nextChoiceIndex];
        proposer.nextProposalIndex += 1;
  
        if (proposer.preferences.length > 0) {
          if (proposer === 'applicants') {
            const employer = employers.find(emp => emp.name === nextChoice);
            if (!matches[nextChoice] || employer.preferences.indexOf(proposer.name) < employer.preferences.indexOf(matches[nextChoice])) {
              if (matches[nextChoice]) {
                const formerApplicant = applicants.find(app => app.name === matches[nextChoice]);
                freeProposers.push({ ...formerApplicant, nextProposalIndex: formerApplicant.nextProposalIndex });
              }
              matches[nextChoice] = proposer.name;
            } else {
              freeProposers.push(proposer);
            }
          } else {
            const applicant = applicants.find(app => app.name === nextChoice);
            if (!matches[nextChoice] || applicant.preferences.indexOf(proposer.name) < applicant.preferences.indexOf(matches[nextChoice])) {
              if (matches[nextChoice]) {
                const formerEmployer = employers.find(emp => emp.name === matches[nextChoice]);
                freeProposers.push({ ...formerEmployer, nextProposalIndex: formerEmployer.nextProposalIndex });
              }
              matches[nextChoice] = proposer.name;
            } else {
              freeProposers.push(proposer);
            }
          }
        }
      }
  
      return matches;
    }
  })();
  