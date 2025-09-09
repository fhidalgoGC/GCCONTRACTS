import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Building2, Search, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { type CrmPerson } from '@/services/crm-people/crm-people.service';
import { PersonSelectionModalProps } from './PersonSelectionModal.types';
import { usePersonSelection } from './PersonSelectionModal.hooks';
import { useLocalTranslation } from './hooks/useLocalTranslation';
import { getDefaultTexts, getDisplayName, getOrganizationName, getPrimaryEmail, getPersonType } from './PersonSelectionModal.utils';
import './PersonSelectionModal.css';

export const PersonSelectionModalView: React.FC<PersonSelectionModalProps> = ({
  onSelect,
  selectedPersonId,
  selectedPersonName,
  personType,
  error = false,
  triggerButtonText,
  modalTitle,
  searchPlaceholder,
  noDataMessage,
  contractType = "purchase"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { people, loading, loadingMore, searchLoading, hasMore, handleLoadMore } = usePersonSelection(
    personType, 
    isOpen, 
    searchTerm
  );

  const { t } = useLocalTranslation();
  const defaultTexts = getDefaultTexts(personType, contractType, t);

  // Infinite scroll handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    if (scrollHeight - scrollTop === clientHeight) {
      handleLoadMore();
    }
  };

  const handleSelectPerson = (person: CrmPerson) => {
    const personId = person._id || person.id;
    const personName = person.full_name || person.name;
    
    const personData = {
      id: personId,
      name: personName,
      ...person
    };

    onSelect(personData);
    setIsOpen(false);
    setSearchTerm('');
    console.log(`${personType} selected:`, personData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className={`person-selection-trigger ${
            error ? 'error' : ''
          } ${selectedPersonName ? 'selected' : 'placeholder'}`}
          data-testid={`button-select-${personType}`}
        >
          <User className="person-selection-trigger-icon" />
          <div className="person-selection-trigger-content">
            <span className="person-selection-trigger-text">
              {selectedPersonName || triggerButtonText || defaultTexts.triggerText}
            </span>
            {selectedPersonName && (
              <span className="person-selection-trigger-subtext">
                {triggerButtonText || defaultTexts.triggerText}
              </span>
            )}
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="person-selection-dialog">
        <DialogHeader>
          <DialogTitle className="person-selection-title">
            <User className="person-selection-title-icon" />
            <span>{modalTitle || defaultTexts.modalTitle}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="person-selection-container">
          {/* Search Input */}
          <div className="person-selection-search-container">
            <Search className="person-selection-search-icon" />
            <Input
              placeholder={searchPlaceholder || defaultTexts.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="person-selection-search"
              data-testid={`input-search-${personType}`}
            />
            {/* Search loading indicator */}
            {searchLoading && (
              <div className="person-selection-search-loading-container">
                <div className="person-selection-search-loading-icon"></div>
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="person-selection-loading">
              <div className="person-selection-loading-spinner"></div>
              <p className="person-selection-loading-text">{defaultTexts.loadingMessage}</p>
              <p className="person-selection-loading-subtext">{t('loadingData')}</p>
            </div>
          )}

          {/* Results */}
          {!loading && (
            <div className="person-selection-results" onScroll={handleScroll}>
              {/* Search loading overlay */}
              {searchLoading && (
                <div className="person-selection-search-overlay">
                  <div className="person-selection-search-loading">
                    <div className="person-selection-search-spinner"></div>
                    <p className="person-selection-search-text">
                      {defaultTexts.searchingMessage}
                    </p>
                  </div>
                </div>
              )}
              {people.length === 0 ? (
                <div className="person-selection-empty">
                  <User className="person-selection-empty-icon" />
                  <p>{noDataMessage || defaultTexts.noDataMessage}</p>
                </div>
              ) : (
                <div className="person-selection-grid">
                  {people.map((person, index) => (
                    <div
                      key={`${person._id || person.id}-${index}`}
                      className="person-selection-card"
                      onClick={() => handleSelectPerson(person)}
                      data-testid={`card-${personType}-${person._id || person.id}`}
                    >
                      <div className="person-selection-card-content">
                        <div className="person-selection-avatar">
                          {getPersonType(person) === 'juridical_person' ? (
                            <Building2 className="person-selection-avatar-icon" />
                          ) : (
                            <User className="person-selection-avatar-icon" />
                          )}
                        </div>
                        
                        <div className="person-selection-info">
                          <div className="person-selection-header">
                            <h3 className="person-selection-name">
                              {getDisplayName(person, t)}
                            </h3>
                            <Badge variant={getPersonType(person) === 'juridical_person' ? 'default' : 'secondary'}>
                              {getPersonType(person) === 'juridical_person' ? t('company') : t('person')}
                            </Badge>
                          </div>
                          
                          {getOrganizationName(person) && (
                            <p className="person-selection-organization">
                              <Building2 className="person-selection-organization-icon" />
                              {getOrganizationName(person)}
                            </p>
                          )}
                          
                          {getPrimaryEmail(person) && (
                            <p className="person-selection-email">
                              <Mail className="person-selection-email-icon" />
                              {getPrimaryEmail(person)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Load More Indicator */}
              {loadingMore && (
                <div className="person-selection-load-more">
                  <div className="person-selection-load-more-spinner"></div>
                  <span className="person-selection-load-more-text">{t('loadingMore')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};