import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  HostListener,
  ContentChildren,
  QueryList,
  AfterContentInit,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-custom-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="isOpen"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-1000 p-4"
      (click)="onBackdropClick($event)"
    >
      <div
        class="bg-white rounded-lg shadow-xl {{
          width
        }} max-h-[90vh] flex flex-col"
      >
        <div class="p-6">
          <h2 class="text-lg font-semibold">
            <ng-content select="[dialogTitle]"></ng-content>
          </h2>
          <div
            [ngClass]="{ 'text-gray-600': hasDescription, 'mb-4': hasContent }"
          >
            <ng-content select="[dialogDescription]"></ng-content>
          </div>
        </div>
        <div [ngClass]="{ 'flex-grow overflow-y-auto px-6 pb-6': hasContent }">
          <ng-content select="[dialogContent]"></ng-content>
        </div>
        <div
          class="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-2"
        >
          <ng-content select="[dialogFooter]"></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class CustomModalComponent {
  @Input() isOpen: boolean = false;
  @Input() width: string = 'w-[500px]';
  @Output() closeDialog = new EventEmitter<void>();

  @ContentChildren('dialogContent', { descendants: true })
  dialogContent!: QueryList<TemplateRef<any>>;

  @ContentChildren('dialogDescription', { descendants: true })
  dialogDescription!: QueryList<TemplateRef<any>>;

  @ContentChildren('dialogFooter', { descendants: true })
  dialogFooter!: QueryList<TemplateRef<any>>;

  constructor(private elementRef: ElementRef) {}

  get hasContent(): boolean {
    return this.dialogContent.length > 0;
  }

  get hasDescription(): boolean {
    return this.dialogDescription.length > 0;
  }

  onBackdropClick(event: MouseEvent): void {
    const clickedElement = event.target as HTMLElement;
    if (
      clickedElement === this.elementRef.nativeElement.querySelector('.fixed')
    ) {
      this.closeDialog.emit();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscKeydown(event: KeyboardEvent) {
    if (this.isOpen) {
      this.closeDialog.emit();
    }
  }
}
