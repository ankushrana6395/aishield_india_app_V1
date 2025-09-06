import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LectureTemplate = ({ lectureData }) => {
  const { user } = useAuth();
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState({});
  const [language, setLanguage] = useState('en');

  // Toggle language between English and Hindi
  const toggleLanguage = () => {
    setLanguage(prevLang => prevLang === 'en' ? 'hi' : 'en');
  };

  // Handle answer selection
  const handleAnswerSelect = (questionIndex, optionIndex) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
  };

  // Check answer
  const checkAnswer = (questionIndex, correctAnswer) => {
    const userAnswer = selectedAnswers[questionIndex];
    const iscorrect = userAnswer === correctAnswer;
    
    setShowResults(prev => ({
      ...prev,
      [questionIndex]: { iscorrect, correctAnswer, userAnswer }
    }));
  };

  // Get localized text based on selected language
  const getLocalizedText = (englishText, hindiText) => {
    return language === 'en' ? englishText : hindiText;
  };

  return (
    <div className="lecture-content">
      {/* Language toggle button */}
      <div className="language-toggle">
        <button onClick={toggleLanguage} className="btn btn-secondary">
          {language === 'en' ? 'Switch to Hindi' : 'अंग्रे़ी पर स्विच करें'}
        </button>
      </div>

      {/* Lecture header */}
      <header className="lecture-title">
        <h1>{lectureData.title}</h1>
        <h2>{lectureData.subtitle}</h2>
        <p>{lectureData.description}</p>
      </header>

      {/* Lecture Sections */}
      {lectureData.sections && lectureData.sections.map((section, sectionIndex) => (
        <section key={sectionIndex} className="lecture-section">
          <h3>{section.title}</h3>
          {section.content && section.content.map((contentItem, itemIndex) => (
            <div key={itemIndex} className="content-item">
              {contentItem.heading && <h4>{contentItem.heading}</h4>}
              
              {contentItem.paragraphs && (
                <div className="paragraphs">
                  {contentItem.paragraphs.map((paragraph, pIndex) => (
                    <p key={pIndex}>
                      {getLocalizedText(paragraph, (contentItem.paragraphsHi &&contentItem.paragraphsHi[pIndex]) || paragraph)}
                    </p>
                  ))}
                </div>
              )}

              {contentItem.list && (
                <ul className="content-list">
                  {contentItem.list.map((listItem, lIndex) => (
                    <li key={lIndex}>
                      {getLocalizedText(listItem, (contentItem.listHi &&contentItem.listHi[lIndex]) || listItem)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      ))}

      {/* Quiz Section */}
      {lectureData.quizQuestions && lectureData.quizQuestions.length > 0 && (
        <section className="quiz-section">
          <h3>Quiz</h3>
          {lectureData.quizQuestions.map((question, qIndex) => (
            <div key={qIndex} className="quiz-question">
              <h4>{getLocalizedText(question.question.en, question.question.hi)}</h4>
              <div className="quiz-options">
                {question.options.en.map((option, oIndex) => (
                  <div 
                    key={oIndex} 
                    className={`quiz-option ${selectedAnswers[qIndex] === oIndex ? 'selected' : ''}`}
                    onClick={() => handleAnswerSelect(qIndex, oIndex)}
                  >
                    <span className="option-letter">
                      {String.fromCharCode(65 + oIndex)}.
                    </span>
                    <span className="option-content">
                      {getLocalizedText(option, (question.options.hi && question.options.hi[oIndex]) || option)}
                    </span>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => checkAnswer(qIndex, question.correctAnswer)} 
                className="btn btn-primary"
                disabled={selectedAnswers[qIndex] === undefined}
              >
                Check Answer
              </button>
              {showResults[qIndex] && (
                <div className={`quiz-result ${showResults[qIndex].iscorrect ? 'correct' : 'incorrect'}`}>
                  <p>
                    {showResults[qIndex].iscorrect 
                      ? "✓ Correct!" 
                      : `✗ Incorrect. The correct answer is ${String.fromCharCode(65 + showResults[qIndex].correctAnswer)}.`}
                  </p>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Lecture Footer */}
      <div className="lecture-footer">
        <p>Last updated: {new Date(lectureData.updatedAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default LectureTemplate;
