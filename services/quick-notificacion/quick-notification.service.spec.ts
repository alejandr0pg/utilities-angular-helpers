import { TestBed } from '@angular/core/testing';

import { QuickNotificationService } from './quick-notification.service';

describe('QuickNotificationService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: QuickNotificationService = TestBed.get(QuickNotificationService);
    expect(service).toBeTruthy();
  });
});
