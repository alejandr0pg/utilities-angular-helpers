import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class QuickNotificationService {

  public prefix = `/email-notification`;

  constructor(
    private apiSrv: ApiService,
  ) { }

  /**
   * Enviar notificaciones rapidas por correo electronico
   * - Linea
   * -- { type: 'line', text: ''}
   * - Boton de acción
   * -- {type: 'action', action: '', url: ''}
   * - Contenido HTML
   * -- {type: 'html', html: ''}
   * @param params 
   * @returns 
   */
  async sendEmailNotification(params: EmailNotification) {
    try {
      return await this.apiSrv.post(`${this.prefix}/quick-custom-notification`, params);
    } catch (err) {
      console.log('Error on QuickNotificationService.sendEmailNotification', err);
      throw err;
    }
  }

}

export interface EmailNotification {
  type?: string;
  email: string;
  subject: string;
  messageBody: (MessageBodyLine | MessageBodyAction | MessageBodyHTML)[];
  greeting?: string;
  salutation?: string;
  cc?: string | null;
  bcc?: string | null;
  uid?: string;
}

export interface MessageBodyLine {
  type: 'line';
  text: string;
}

export interface MessageBodyAction {
  type: 'action';
  action: string;
  url: string;
}

export interface MessageBodyHTML {
  type: 'html';
  html: string;
}